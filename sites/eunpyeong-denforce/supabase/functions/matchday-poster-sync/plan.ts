// 매치데이 포스터 자동 연결 (D-096) — 무엇을 넣을지 정하는 순수 함수 (테스트: matchday-poster-sync.test.ts). I/O 는 index.ts
// 드라이브 폴더 구조(소유자 2026-11-15): 루트 아래 'MM/DD vs 상대 (HOME|AWAY)' 폴더, 안에 'MATCH-DAY.jpg', 경기 뒤 이름에 'FULL' 이 든 이미지.
// 이름에 연도가 없어 같은 달/일 + 같은 상대 경기 중 지금과 가장 가까운 것 하나에 맞춘다.
import { sameOpponent } from "../kfl-video-sync/plan.ts";

export type PosterField = "matchday_poster_url" | "fulltime_poster_url";
export const FIELDS: readonly PosterField[] = ["matchday_poster_url", "fulltime_poster_url"];

/** 웹용 크기 — 긴 변 (드라이브 썸네일 =s1600, JPEG) */
export const POSTER_LONG_SIDE = 1600;
/** 경기 날이 아니면 이만큼 지나야 다시 읽는다 */
export const IDLE_INTERVAL_MS = 3 * 3600_000;
const KST_MS = 9 * 3600_000;

export type FolderName = { month: number; day: number; opponent: string; side: "HOME" | "AWAY" };

/** '11/15 vs 노원제너FS (AWAY)' → 달, 일, 상대, 홈/원정. 모양이 다르면 null */
export function parseFolderName(name: string): FolderName | null {
  const m = name.normalize("NFC").match(/^\s*(\d{1,2})\s*[/.]\s*(\d{1,2})\s*vs\.?\s*(.+?)\s*\(\s*(HOME|AWAY)\s*\)\s*$/i);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || !m[3].trim()) return null;
  return { month, day, opponent: m[3].trim(), side: m[4].toUpperCase() as "HOME" | "AWAY" };
}

/** 이미지 파일 이름 → 포스터 종류. 'FULL' 이 들면 FULL TIME, 'MATCH DAY'(띄어쓰기/하이픈/밑줄 무시)면 MATCH DAY */
export function posterKind(fileName: string): PosterField | null {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "");
  if (/full/i.test(base)) return "fulltime_poster_url";
  if (/match[\s_-]*day/i.test(base)) return "matchday_poster_url";
  return null;
}

export type DriveFile = { id: string; name: string; mimeType: string; thumbnailLink?: string; modifiedTime?: string };
export type PosterMatch = { id: string; kickoff: string; opponent: string; matchday_poster_url: string | null; fulltime_poster_url: string | null };

/** 서울 날짜 'YYYY-MM-DD' */
export const seoulDay = (ms: number) => new Date(ms + KST_MS).toISOString().slice(0, 10);

/** 폴더 이름 → 경기 하나 (같은 달/일 + 같은 상대, 여럿이면 지금과 가장 가까운 것). 없으면 이유 */
export function matchForFolder(f: FolderName, matches: readonly PosterMatch[], now: number): PosterMatch | string {
  const mmdd = `${String(f.month).padStart(2, "0")}-${String(f.day).padStart(2, "0")}`;
  const found = matches.filter((m) => seoulDay(Date.parse(m.kickoff)).slice(5) === mmdd && sameOpponent(f.opponent, m.opponent));
  if (found.length === 0) return `${f.month}/${f.day} ${f.opponent}: 맞는 경기 없음`;
  return [...found].sort((a, b) => Math.abs(Date.parse(a.kickoff) - now) - Math.abs(Date.parse(b.kickoff) - now))[0];
}

export type PosterUpdate = { matchId: string; field: PosterField; fileId: string; thumb: string; fileName: string };

/** 넣은 칸 기록 키 */
export const appliedKey = (matchId: string, field: PosterField) => `${matchId}:${field}`;

/** 썸네일 주소의 크기 꼬리(=s220 등)를 바꾼다 (drive-library 와 같은 규칙) */
export function sizedThumb(link: string, side: number): string {
  return /=s\d+(-[a-z0-9-]+)?$/i.test(link) ? link.replace(/=s\d+(-[a-z0-9-]+)?$/i, `=s${side}`) : `${link}=s${side}`;
}

/**
 * 한 경기 폴더의 파일들 → 넣을 칸. 칸이 비어 있고, 이 함수가 넣은 적이 없을 때만(넣었는데 비어 있으면 관리자가 지운 것).
 * 같은 종류가 여러 장이면 가장 최근에 바뀐 것.
 */
export function planFolder(match: PosterMatch, files: readonly DriveFile[], applied: ReadonlySet<string>): { updates: PosterUpdate[]; notes: string[] } {
  const updates: PosterUpdate[] = [];
  const notes: string[] = [];
  for (const field of FIELDS) {
    const list = files
      .filter((f) => f.mimeType.startsWith("image/") && posterKind(f.name) === field)
      .sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""));
    if (!list.length || match[field]) continue;
    if (applied.has(appliedKey(match.id, field))) continue;
    const file = list[0];
    if (!file.thumbnailLink) {
      notes.push(`${file.name}: 드라이브 미리보기가 아직 없음(다음 실행에 다시)`);
      continue;
    }
    updates.push({ matchId: match.id, field, fileId: file.id, thumb: sizedThumb(file.thumbnailLink, POSTER_LONG_SIDE), fileName: file.name });
  }
  return { updates, notes };
}

/** 저장소 경로 — 경기마다 한 자리 (다시 넣어도 같은 파일) */
export function storagePath(matchId: string, field: PosterField): string {
  return field === "fulltime_poster_url" ? `matchday/${matchId}-ft.jpg` : `matchday/${matchId}.jpg`;
}

/** 이번 호출에 드라이브를 읽을지 — 경기 날(서울)이면 매번, 아니면 마지막 성공 뒤 3시간 */
export function shouldRun(now: number, kickoffs: readonly string[], lastOkAt: string | null): boolean {
  const today = seoulDay(now);
  if (kickoffs.some((k) => seoulDay(Date.parse(k)) === today)) return true;
  return lastOkAt === null || now - Date.parse(lastOkAt) >= IDLE_INTERVAL_MS;
}

/** 읽을 폴더인지 — 아직 칸이 남은 경기 (어제부터 60일 안) */
export function needsPoster(m: PosterMatch, applied: ReadonlySet<string>): boolean {
  return FIELDS.some((f) => !m[f] && !applied.has(appliedKey(m.id, f)));
}
