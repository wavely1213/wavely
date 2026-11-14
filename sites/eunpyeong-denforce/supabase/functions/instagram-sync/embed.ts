// 구단 인스타그램 새 게시물 확인 (D-064) — 공개 프로필 임베드 HTML 읽기 + 게시물 종류 나누기. 순수 함수만 (테스트: instagram-embed.test.ts).
// 프로필 임베드(instagram.com/<계정>/embed/)는 로그인 없이 최근 게시물 6개를 HTML 안의 contextJSON 에 담아 준다.
// 종류별 사이트 반영 규칙은 DOMAIN_KNOWLEDGE BR-029.

export type IgPostType = "reel" | "welcome" | "farewell" | "matchday" | "result" | "photo" | "other";

export type IgPost = {
  code: string;
  id: string;
  /** GraphImage / GraphVideo / GraphSidecar */
  typename: string;
  isVideo: boolean;
  /** 게시 시각 (unix 초) */
  takenAt: number;
  caption: string;
  displayUrl: string;
};

type MediaNode = {
  __typename?: string;
  id?: string;
  shortcode?: string;
  is_video?: boolean;
  taken_at_timestamp?: number;
  display_url?: string;
  edge_media_to_caption?: { edges?: { node?: { text?: string } }[] };
};

/** 임베드 HTML → 게시물 목록 (최신순 그대로). contextJSON 이 없거나 모양이 바뀌면 오류 — 조용히 0개로 넘어가지 않게 */
export function parseProfileEmbed(html: string): IgPost[] {
  const m = /"contextJSON":("(?:[^"\\]|\\.)*")/.exec(html);
  if (!m) throw new Error("contextJSON 없음 — 인스타그램 임베드 모양이 바뀌었거나 막혔습니다");
  const context = JSON.parse(JSON.parse(m[1]) as string) as { context?: { graphql_media?: { shortcode_media?: MediaNode }[] } };
  const list = context.context?.graphql_media;
  if (!Array.isArray(list)) throw new Error("graphql_media 없음 — 인스타그램 임베드 모양이 바뀌었습니다");
  return list.map(({ shortcode_media: n }) => {
    if (!n?.shortcode || !n.id || typeof n.taken_at_timestamp !== "number") throw new Error("게시물 칸이 빠졌습니다 (shortcode/id/taken_at)");
    return {
      code: n.shortcode,
      id: n.id,
      typename: n.__typename ?? "",
      isVideo: n.is_video === true,
      takenAt: n.taken_at_timestamp,
      caption: n.edge_media_to_caption?.edges?.[0]?.node?.text ?? "",
      displayUrl: n.display_url ?? "",
    };
  });
}

/** 게시물 종류 — 글 첫 부분의 구단 머리말로 나눈다 (𝑾𝑬𝑳𝑪𝑶𝑴𝑬 같은 꾸밈 글자는 NFKC 로 보통 글자로) */
export function classifyPost(post: Pick<IgPost, "caption" | "isVideo">): IgPostType {
  if (post.isVideo) return "reel";
  const head = post.caption.normalize("NFKC").slice(0, 80).toUpperCase();
  if (/WELCOME/.test(head)) return "welcome";
  if (/GOOD ?LUCK|THANK ?YOU/.test(head)) return "farewell";
  // FULL TIME(경기 뒤 결과 글, 2026-27 모양 '𝑭𝑼𝑳𝑳 𝑻𝑰𝑴𝑬 …')은 첫 줄에 있을 때만 — 본문의 'full time' 같은 말로 바뀌지 않게
  const first = (head.split("\n").find((l) => l.trim()) ?? "").trim();
  if (/^\W*FULL ?TIME/u.test(first)) return "result";
  if (/MATCH ?DAY/.test(head)) return "matchday";
  if (/경기 ?결과/.test(head)) return "result";
  if (/MATCH ?PHOTO/.test(head)) return "photo";
  return "other";
}

/** unix 초 → 한국 시간 "YYYY-MM-DD HH:MM" */
export function kstDateTime(unixSeconds: number): string {
  return new Date((unixSeconds + 9 * 3600) * 1000).toISOString().slice(0, 16).replace("T", " ");
}

/** 우리 구단 이름 — 줄여 쓴 이름(은평덴포스, 덴포스, 은평FS)과 영문도 */
const CLUB = /서울\s*은평|은평\s*(덴포스|FS)|덴포스|EUNPYEONG|DENFORCE/i;

/** "13:00", "오후 2:00", "2:00 PM" → 24시간 "HH:MM". 오전/오후 표시 없이 9시 전이면 잘못 읽었을 수 있어 null */
export function kickoffTime(text: string): string | null {
  const m = /(\d{1,2}):(\d{2})/.exec(text);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2];
  const pm = /오후|PM|P\.M\./i.test(text);
  const am = /오전|AM|A\.M\./i.test(text);
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  if (h > 23 || Number(min) > 59) return null;
  if (!pm && !am && h < 9) return null;
  return `${String(h).padStart(2, "0")}:${min}`;
}

export type MatchdayHint = { heading: string; opponent: string | null; time: string | null; venue: string | null };

/**
 * MATCH DAY 글 → 대회/라운드 줄, 상대, 시작 시각, 경기장. 예:
 * "🔵MATCH DAY⚪️\n\n15라운드\n🆚 서울은평덴포스 vs 전주시민풋살구단\n🕑 13:00\n📍 은평다목적체육관"
 * 홈/원정은 글에 없다 — 반영할 때 경기장·연맹 일정으로 정한다.
 */
export function parseMatchday(caption: string): MatchdayHint {
  const lines = caption.split("\n").map((l) => l.trim()).filter(Boolean);
  const vsAt = lines.findIndex((l) => /\bvs\b/i.test(l));
  // 상대만 적힌 '🆚 상대' 줄 위까지가 머리말 (2026-27 모양)
  const soloVs = vsAt < 0 ? lines.findIndex((l) => l.startsWith("🆚")) : -1;
  const end = vsAt >= 0 ? vsAt : soloVs >= 0 ? soloVs : 1;
  const heading = lines.slice(1, end).filter((l) => !l.startsWith("#")).join(" ");
  let opponent: string | null = null;
  if (vsAt >= 0) {
    const sides = lines[vsAt].replace(/^🆚\s*/u, "").split(/\s+vs\s+/i).map((s) => s.trim());
    // 한쪽만 우리 구단일 때만 — 둘 다 아니거나 둘 다면 상대를 모른다
    const ours = sides.filter((s) => CLUB.test(s));
    if (sides.length === 2 && ours.length === 1) opponent = sides.find((s) => !CLUB.test(s)) ?? null;
  }
  // 2026-27 모양: '🆚 노원제너FS' (상대만), '⏰ 11.15 (일) 14:00'
  if (vsAt < 0) {
    const only = lines.find((l) => l.startsWith("🆚"))?.replace(/^🆚\s*/u, "").trim();
    if (only && !CLUB.test(only)) opponent = only;
  }
  const time = kickoffTime(lines.find((l) => l.startsWith("🕑") || l.startsWith("⏰")) ?? "");
  const venue = lines.find((l) => l.startsWith("📍"))?.replace(/^📍\s*/u, "") || null;
  return { heading, opponent, time, venue };
}

export type ResultHint = {
  opponent: string | null;
  scoreUs: number | null;
  scoreThem: number | null;
  /** '이름 전반 5, 후반 6' 모양 (숫자 = 분) */
  scorerLines: string[];
  /** '⚽ 김영록 2, 윤창욱' 모양 (숫자 = 골 수, 2026-27) */
  ballScorers: Array<[string, number]>;
  /** 점수 줄에 팀 이름이 없어 어느 쪽 점수인지 모름 — 반영하지 않고 확인 필요 */
  scoreUnclear: boolean;
};

/** '⚽ 김영록 2, 윤창욱' / '⚽️ 김영록' → [이름, 골 수]. 자책골(O.G, 자책)은 뺀다 */
export function ballScorers(lines: readonly string[]): Array<[string, number]> {
  const out = new Map<string, number>();
  for (const line of lines) {
    if (!line.startsWith("⚽")) continue;
    for (const part of line.replace(/^⚽\uFE0F?\s*/u, "").split(/[,，]/)) {
      const m = /^\s*(\S+?)\s*(?:\(?\s*(\d+)\s*(?:골)?\s*\)?)?\s*$/u.exec(part);
      if (!m || /^(O\.?G\.?|자책)/i.test(m[1])) continue;
      out.set(m[1], (out.get(m[1]) ?? 0) + (m[2] ? Number(m[2]) : 1));
    }
  }
  return [...out];
}

/**
 * 경기결과 글 → 상대, 점수, 득점 줄. 예:
 * "⚪15라운드 경기결과🔵\n\n서울은평덴포스 7 : 5 전주시민풋살구단\n\n백승하 전반 5, 후반 6, 14\n윤창욱 전반 11\n\n#서울은평덴포스"
 */
export function parseResult(caption: string): ResultHint {
  const lines = caption.split("\n").map((l) => l.trim()).filter(Boolean);
  const scoreLine = lines.find((l) => /\d+\s*:\s*\d+/.test(l));
  let opponent: string | null = null;
  let scoreUs: number | null = null;
  let scoreThem: number | null = null;
  let scoreUnclear = false;
  if (scoreLine) {
    const m = /^(.+?)\s+(\d+)\s*:\s*(\d+)\s+(.+)$/.exec(scoreLine);
    if (m) {
      const [left, a, b, right] = [m[1].trim(), Number(m[2]), Number(m[3]), m[4].trim()];
      if (CLUB.test(left) && !CLUB.test(right)) [opponent, scoreUs, scoreThem] = [right, a, b];
      else if (CLUB.test(right) && !CLUB.test(left)) [opponent, scoreUs, scoreThem] = [left, b, a];
    } else if (/^\D*\d+\s*:\s*\d+\D*$/.test(scoreLine)) {
      // '3 : 2' 만 있는 줄 — 앞 숫자가 우리인지 홈 기준인지 글만으로 알 수 없다. 틀린 점수보다 비워 두고 확인 필요
      scoreUnclear = true;
    }
  }
  // 상대가 '🆚 노원제너FS' 줄에만 있는 모양 (2026-27)
  if (!opponent) {
    const vs = lines.find((l) => l.startsWith("🆚"))?.replace(/^🆚\s*/u, "").trim();
    if (vs && !/\bvs\b/i.test(vs) && !CLUB.test(vs)) opponent = vs;
  }
  const after = scoreLine ? lines.slice(lines.indexOf(scoreLine) + 1) : lines;
  const scorerLines = after.filter((l) => !l.startsWith("#") && !l.startsWith("⚽") && /(전반|후반|연장)/.test(l));
  return { opponent, scoreUs, scoreThem, scorerLines, ballScorers: ballScorers(lines), scoreUnclear };
}

/** 사이트에 이미 넣은 게시물 코드 — postings.url 의 /p/<코드>/ 또는 /reel/<코드>/ (계정 이름이 낀 주소도). 모든 구단 게시물은 포스팅에 들어간다 (BR-029) */
export function knownCodes(urls: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const u of urls) {
    const m = /instagram\.com\/(?:[A-Za-z0-9._]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/.exec(u);
    if (m) out.add(m[1]);
  }
  return out;
}
