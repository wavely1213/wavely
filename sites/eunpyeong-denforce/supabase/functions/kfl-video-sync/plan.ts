// 연맹 유튜브 경기 영상 자동 연결 (D-090) — 순수 함수. Deno/Node 둘 다에서 돈다 (테스트: kfl-video-sync.test.ts)
// 출처: 한국풋살연맹 - KFL 공개 RSS(키 없음, 최근 15개). 제목에 '은평' 또는 '덴포스'가 있는 영상만.
// 짝짓기 규칙은 supabase/data/2026-10-18_match_videos.sql 손작업과 같다: 제목 속 경기 날짜(서울) + 상대 팀, 하루 한 경기.

/** 한국풋살연맹 - KFL (@kfl7010) */
export const KFL_CHANNEL_ID = "UCf8oQ3Clz_d5bpeMEv3AZrg";
export const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${KFL_CHANNEL_ID}`;

export type FeedEntry = { videoId: string; title: string; published: string };
export type VideoKind = "replay" | "highlight";
export type ParsedTitle = { kind: VideoKind; teams: [string, string]; date: string | null };

export type MatchLite = {
  id: string;
  /** 서울 날짜 YYYY-MM-DD (kickoff 를 Asia/Seoul 로 본 날짜) */
  date: string;
  opponent: string;
  highlight_url: string | null;
  replay_url: string | null;
};

export type Update = { matchId: string; field: "highlight_url" | "replay_url"; url: string; videoId: string; title: string };
export type Plan = { updates: Update[]; notes: string[] };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const OURS = /은평|덴포스/;

/** 상대 이름 별칭 묶음 — 연맹 영상 제목과 matches.opponent 표기가 다른 팀 (손작업 기록 2026-10-18). 비교는 정규화(띄어쓰기, 대소문자 무시)한 이름끼리 */
export const OPPONENT_ALIASES: readonly (readonly string[])[] = [["전주시민풋살구단", "전주시민풋살클럽"]];

/** XML 글자 참조 풀기. &amp; 는 마지막(&amp;amp; → &amp;). 범위 밖 숫자 참조는 RangeError — 부르는 쪽이 그 항목만 버린다 */
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

/** RSS(Atom) → 영상 목록. 형식이 틀린 항목은 버린다 */
export function parseFeed(xml: string): FeedEntry[] {
  const out: FeedEntry[] = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const body = m[1];
    const id = body.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim() ?? "";
    const title = body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    const published = body.match(/<published>([^<]+)<\/published>/)?.[1]?.trim() ?? "";
    if (!VIDEO_ID.test(id) || !title) continue;
    let decoded: string;
    try {
      decoded = decodeXml(title).trim();
    } catch {
      continue; // 깨진 글자 참조 — 이 항목만 버린다 (피드 전체를 버리지 않게)
    }
    out.push({ videoId: id, title: decoded, published });
  }
  return out;
}

/** 이름 비교용 — 띄어쓰기, 대소문자 무시 */
export function normalizeTeam(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

/** 상대 팀이 같은지 — 같은 이름 또는 같은 별칭 묶음 */
export function sameOpponent(titleTeam: string, opponent: string): boolean {
  const a = normalizeTeam(titleTeam);
  const b = normalizeTeam(opponent);
  if (a === b) return true;
  return OPPONENT_ALIASES.some((group) => {
    const names = group.map(normalizeTeam);
    return names.includes(a) && names.includes(b);
  });
}

const DATE = /(\d{4})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})/;

/**
 * 제목 → 종류, 두 팀, 날짜. 경기 영상이 아니면 null.
 *   '[FK1] 노원제너FS VS 서울은평덴포스 (2026.11.15.) - 1R'      → replay (생중계)
 *   '[LIVE] 서울은평 덴포스 vs 강원FS (2025/11/15)  1라운드'     → replay
 *   '[다시보기] 2025/12/28 고양불스풋살클럽vs서울은평 덴포스'      → replay
 *   '[하이라이트] …' / '… 경기 하이라이트 (2026.11.14)'           → highlight
 *   '[인터뷰] …', VS 가 없는 제목                                → null
 */
export function parseTitle(title: string): ParsedTitle | null {
  if (/\[(인터뷰|interview)\]|인터뷰/i.test(title)) return null;
  const kind: VideoKind = /하이라이트|highlight/i.test(title) ? "highlight" : "replay";
  const dm = title.match(DATE);
  let date: string | null = null;
  if (dm) {
    const [, y, mo, d] = dm;
    const mm = Number(mo);
    const dd = Number(d);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) date = `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  // 대진 찾기:
  //  1) '|' 로 나뉜 제목('[2026.08.25] … 3라운드 | A vs B')은 VS 가 든 칸만 본다
  //  2) '(날짜)' 괄호가 있으면 그 앞만 본다 — 뒤 꼬리(승강 플레이오프, - 1R, 1라운드 등)는 팀 이름이 아니다
  //  3) 남은 [태그], 날짜, '경기 하이라이트', 끝의 '- nR' / 'n라운드' / 단계 글자를 뗀다
  let core = title.split("|").find((part) => /vs/i.test(part)) ?? title;
  const paren = core.match(/\(\s*\d{4}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{1,2}\.?\s*\)/);
  if (paren && paren.index !== undefined) core = core.slice(0, paren.index);
  core = core
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(DATE, " ")
    .replace(/경기\s*하이라이트|하이라이트|다시보기/g, " ")
    .replace(/\s[-–]\s*.*$/, " ")
    .replace(/\s\d+\s*(R|라운드)\s*$/i, " ")
    .replace(/\s(승강\s*(플레이오프|PO)|플레이오프|준?결승|\d+강)\s*$/i, " ");
  const vs = core.split(/\s*vs\.?\s*/i);
  if (vs.length !== 2) return null;
  const a = vs[0].trim();
  const b = vs[1].trim();
  if (!a || !b) return null;
  return { kind, teams: [a, b], date };
}

/** 우리 팀이 아닌 쪽 (둘 다 우리거나 둘 다 아니면 null) */
export function opponentOf(teams: [string, string]): string | null {
  const [a, b] = teams;
  const ua = OURS.test(a);
  const ub = OURS.test(b);
  if (ua === ub) return null;
  return ua ? b : a;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * 넣을 것 정하기. 규칙:
 *   - 제목에 '은평' 또는 '덴포스' 가 없으면 보지 않는다.
 *   - 날짜가 없으면 게시일로 추정하지 않고 건너뛰고 기록.
 *   - 그 날짜(서울) + 상대 팀이 맞는 경기가 정확히 하나일 때만.
 *   - 그 칸이 비어 있을 때만 (관리자, 총괄이 넣은 값은 덮지 않는다).
 *   - 이 함수가 한 번 넣었던 칸이 지금 비어 있으면 관리자가 지운 것 — 다시 넣지 않는다(applied).
 *   - 같은 경기 같은 칸에 후보가 둘 이상이면 넣지 않고 기록.
 */
/** 이 함수가 한 번 넣었던 칸 — '경기 id:칸' (kfl_video_sync_applied) */
export function appliedKey(matchId: string, field: Update["field"]): string {
  return `${matchId}:${field}`;
}

export function planVideos(entries: FeedEntry[], matches: MatchLite[], applied: ReadonlySet<string> = new Set()): Plan {
  const notes: string[] = [];
  const candidates = new Map<string, Update[]>();
  for (const e of entries) {
    if (!OURS.test(e.title)) continue;
    const p = parseTitle(e.title);
    if (!p) {
      notes.push(`경기 영상 아님: ${e.title} (${e.videoId})`);
      continue;
    }
    if (!p.date) {
      notes.push(`날짜 없음, 건너뜀: ${e.title} (${e.videoId})`);
      continue;
    }
    const opp = opponentOf(p.teams);
    if (!opp) {
      notes.push(`상대 팀을 못 찾음: ${e.title} (${e.videoId})`);
      continue;
    }
    const hits = matches.filter((m) => m.date === p.date && sameOpponent(opp, m.opponent));
    if (hits.length !== 1) {
      notes.push(`${hits.length === 0 ? "맞는 경기 없음" : "맞는 경기가 둘 이상"}: ${e.title} (${e.videoId})`);
      continue;
    }
    const m = hits[0];
    const field = p.kind === "highlight" ? "highlight_url" : "replay_url";
    const key = `${m.id}:${field}`;
    const list = candidates.get(key) ?? [];
    if (!list.some((u) => u.videoId === e.videoId)) list.push({ matchId: m.id, field, url: watchUrl(e.videoId), videoId: e.videoId, title: e.title });
    candidates.set(key, list);
  }
  const updates: Update[] = [];
  for (const [key, list] of candidates) {
    const [matchId, field] = key.split(":") as [string, Update["field"]];
    const m = matches.find((x) => x.id === matchId);
    if (!m) continue;
    if (m[field]) continue; // 이미 값이 있다 — 덮지 않는다 (같은 영상이어도 조용히 넘어감)
    if (applied.has(key)) {
      notes.push(`관리자가 비운 칸이라 다시 넣지 않음 (${m.date} ${m.opponent} ${field})`);
      continue;
    }
    if (list.length > 1) {
      notes.push(`후보 ${list.length}개라 넣지 않음 (${m.date} ${m.opponent} ${field}): ${list.map((u) => u.videoId).join(", ")}`);
      continue;
    }
    updates.push(list[0]);
  }
  return { updates, notes };
}

/** kickoff(ISO, UTC) → 서울 날짜 */
export function seoulDate(iso: string): string {
  const t = Date.parse(iso);
  return new Date(t + 9 * 3600_000).toISOString().slice(0, 10);
}
