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
  if (/MATCH ?DAY/.test(head)) return "matchday";
  if (/경기 ?결과/.test(head)) return "result";
  if (/MATCH ?PHOTO/.test(head)) return "photo";
  return "other";
}

/** unix 초 → 한국 시간 "YYYY-MM-DD HH:MM" */
export function kstDateTime(unixSeconds: number): string {
  return new Date((unixSeconds + 9 * 3600) * 1000).toISOString().slice(0, 16).replace("T", " ");
}

const CLUB = /서울\s*은평\s*덴포스/;

export type MatchdayHint = { heading: string; opponent: string | null; time: string | null; venue: string | null };

/**
 * MATCH DAY 글 → 대회/라운드 줄, 상대, 시작 시각, 경기장. 예:
 * "🔵MATCH DAY⚪️\n\n15라운드\n🆚 서울은평덴포스 vs 전주시민풋살구단\n🕑 13:00\n📍 은평다목적체육관"
 * 홈/원정은 글에 없다 — 반영할 때 경기장·연맹 일정으로 정한다.
 */
export function parseMatchday(caption: string): MatchdayHint {
  const lines = caption.split("\n").map((l) => l.trim()).filter(Boolean);
  const vsAt = lines.findIndex((l) => /\bvs\b/i.test(l));
  const heading = lines.slice(1, vsAt < 0 ? 1 : vsAt).filter((l) => !l.startsWith("#")).join(" ");
  let opponent: string | null = null;
  if (vsAt >= 0) {
    const sides = lines[vsAt].replace(/^🆚\s*/u, "").split(/\s+vs\s+/i).map((s) => s.trim());
    opponent = sides.find((s) => !CLUB.test(s)) ?? null;
  }
  const time = /(\d{1,2}:\d{2})/.exec(lines.find((l) => l.startsWith("🕑")) ?? "")?.[1] ?? null;
  const venue = lines.find((l) => l.startsWith("📍"))?.replace(/^📍\s*/u, "") || null;
  return { heading, opponent, time, venue };
}

export type ResultHint = { opponent: string | null; scoreUs: number | null; scoreThem: number | null; scorerLines: string[] };

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
  if (scoreLine) {
    const m = /^(.+?)\s+(\d+)\s*:\s*(\d+)\s+(.+)$/.exec(scoreLine);
    if (m) {
      const [left, a, b, right] = [m[1].trim(), Number(m[2]), Number(m[3]), m[4].trim()];
      if (CLUB.test(left)) [opponent, scoreUs, scoreThem] = [right, a, b];
      else if (CLUB.test(right)) [opponent, scoreUs, scoreThem] = [left, b, a];
    }
  }
  const after = scoreLine ? lines.slice(lines.indexOf(scoreLine) + 1) : [];
  const scorerLines = after.filter((l) => !l.startsWith("#") && /(전반|후반|연장)/.test(l));
  return { opponent, scoreUs, scoreThem, scorerLines };
}

/** 사이트에 이미 넣은 게시물 코드 — postings.url 의 /p/<코드>/ 또는 /reel/<코드>/ (모든 구단 게시물은 포스팅에 들어간다, BR-029) */
export function knownCodes(urls: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const u of urls) {
    const m = /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/.exec(u);
    if (m) out.add(m[1]);
  }
  return out;
}
