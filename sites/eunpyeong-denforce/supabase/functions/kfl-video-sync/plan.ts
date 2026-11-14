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

/** 상대 이름 별칭 — 연맹 영상 제목과 matches.opponent 표기가 다른 팀 (손작업 기록 2026-10-18) */
export const OPPONENT_ALIASES: Record<string, string[]> = {
  전주시민풋살구단: ["전주시민풋살클럽"],
};

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
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
    if (VIDEO_ID.test(id) && title) out.push({ videoId: id, title: decodeXml(title).trim(), published });
  }
  return out;
}

/** 이름 비교용 — 띄어쓰기, 대소문자 무시 */
export function normalizeTeam(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

/** 상대 팀이 같은지 — 같은 이름 또는 별칭 */
export function sameOpponent(titleTeam: string, opponent: string): boolean {
  const a = normalizeTeam(titleTeam);
  const b = normalizeTeam(opponent);
  if (a === b) return true;
  const aliases = [...(OPPONENT_ALIASES[opponent] ?? []), ...Object.entries(OPPONENT_ALIASES).filter(([, v]) => v.includes(opponent)).map(([k]) => k)];
  return aliases.some((x) => normalizeTeam(x) === a);
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
  // 대진: 앞의 [태그], 날짜, 괄호, '경기 하이라이트', '- 1R' 같은 꼬리를 떼고 'A VS B' 를 찾는다
  const core = title
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(DATE, " ")
    .replace(/경기\s*하이라이트|하이라이트|다시보기/g, " ")
    .replace(/[-–]\s*\d+\s*R\b.*$/i, " ")
    .replace(/\d+\s*라운드.*$/, " ");
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
 *   - 같은 경기 같은 칸에 후보가 둘 이상이면 넣지 않고 기록.
 */
export function planVideos(entries: FeedEntry[], matches: MatchLite[]): Plan {
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
