// 매치데이 포스터 팝업 (D-096) — 순수 함수 (테스트: matchday.test.ts)
// 판정 (브라우저, 서울 시각, 소유자 2026-11-15):
//   1) 경기 날 0:00 전 → 없음
//   2) FULL TIME 포스터 있음 → FULL TIME, 그날 23:59:59 까지
//   3) 없고 경기가 안 끝남(종료 입력 전, 그리고 킥오프 + 4시간 전) → MATCH DAY
//   4) 끝났는데 FULL TIME 아직 없음 → 없음
//   5) 다음 날 0:00 → 없음
// 화면은 미리 만들어 캐시하므로 '지금'은 브라우저에서 잰다(D-092 와 같음) — 서버는 창과 포스터만 넘긴다.
import type { Match } from "@/types";

const KST_MS = 9 * 3600_000;
const DAY_MS = 24 * 3600_000;
/** 킥오프 뒤 이만큼 지나면 끝난 것으로 본다 (D-092 LIVE 창 끝과 같음) */
export const MATCH_END_AFTER_MS = 4 * 3600_000;

export type PosterKind = "matchday" | "fulltime";

export type PosterWindow = {
  matchId: string;
  /** 경기 날 서울 0시 */
  start: number;
  /** 다음 날 서울 0시 */
  end: number;
  /** 킥오프 + 4시간 */
  matchEnd: number;
  finished: boolean;
  matchday: string | null;
  fulltime: string | null;
  /** 포스터를 누르면 갈 인스타 게시물 (없으면 그림만) */
  matchdayPost: string | null;
  fulltimePost: string | null;
  opponent: string;
  isHome: boolean;
  kickoff: string;
};

export type ActivePoster = { window: PosterWindow; kind: PosterKind; image: string };

/** 'YYYY-MM-DD' (서울) */
export function kstDay(ms: number): string {
  return new Date(ms + KST_MS).toISOString().slice(0, 10);
}

function kstMidnight(ms: number): number {
  return Math.floor((ms + KST_MS) / DAY_MS) * DAY_MS - KST_MS;
}

const https = (u: string | null | undefined) => (u?.startsWith("https://") ? u : null);
const instagram = (u: string | null | undefined) => (u?.startsWith("https://www.instagram.com/") ? u : null);

/** 이 경기의 포스터 창. 포스터가 하나도 없거나 날짜 오류면 null */
export function posterWindow(
  m: Pick<Match, "id" | "kickoff" | "status" | "opponent" | "isHome" | "matchdayPoster" | "fulltimePoster" | "matchdayPost" | "fulltimePost">,
): PosterWindow | null {
  const matchday = https(m.matchdayPoster);
  const fulltime = https(m.fulltimePoster);
  if (!matchday && !fulltime) return null;
  const k = Date.parse(m.kickoff);
  if (!Number.isFinite(k)) return null;
  const start = kstMidnight(k);
  return { matchId: m.id, start, end: start + DAY_MS, matchEnd: k + MATCH_END_AFTER_MS, finished: m.status === "finished", matchday, fulltime, matchdayPost: instagram(m.matchdayPost), fulltimePost: instagram(m.fulltimePost), opponent: m.opponent, isHome: m.isHome, kickoff: m.kickoff };
}

/** 포스터가 있는 경기들의 창, 시작 순 (지난 것도 넘긴다 — 시각은 브라우저가 판단) */
export function posterWindows(matches: readonly Match[]): PosterWindow[] {
  return matches
    .map(posterWindow)
    .filter((w): w is PosterWindow => w !== null)
    .sort((a, b) => a.start - b.start || a.matchEnd - b.matchEnd);
}

/** 한 창의 지금 상태 */
export function posterAt(w: PosterWindow, now: number): ActivePoster | null {
  if (now < w.start || now >= w.end) return null;
  if (w.fulltime) return { window: w, kind: "fulltime", image: w.fulltime };
  if (w.matchday && !w.finished && now < w.matchEnd) return { window: w, kind: "matchday", image: w.matchday };
  return null;
}

/** 지금 보일 포스터 (같은 날 두 경기면 먼저 시작하는 것부터) */
export function activePoster(windows: readonly PosterWindow[], now: number): ActivePoster | null {
  for (const w of windows) {
    const a = posterAt(w, now);
    if (a) return a;
  }
  return null;
}

/** '오늘 하루 보지 않기' 저장 키 — 포스터 종류별 (MATCH DAY 를 닫아도 FULL TIME 은 다시 한 번 뜬다) */
export const hideKey = (matchId: string, kind: PosterKind) => `matchday-popup-hide:${matchId}:${kind}`;

/** 저장값(닫은 서울 날짜)이 오늘이 아니면 보인다. 저장값이 없거나 읽을 수 없어도 보인다 */
export function shouldShowPoster(hidden: string | null, now: number): boolean {
  return hidden !== kstDay(now);
}

/** 다음에 상태가 바뀌는 때까지 남은 시간(ms) — 화면이 그때 다시 잰다. 없으면 null */
export function msUntilPosterChange(windows: readonly PosterWindow[], now: number): number | null {
  const edges = windows.flatMap((w) => [w.start, w.matchEnd, w.end]).filter((t) => t > now);
  return edges.length ? Math.min(...edges) - now : null;
}
