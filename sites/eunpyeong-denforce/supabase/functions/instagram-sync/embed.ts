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
  // FULL TIME(경기 뒤 결과 글, 2026-27 '𝑭𝑼𝑳𝑳 𝑻𝑰𝑴𝑬', '𝟭𝗥 𝗙𝗨𝗟𝗟 𝗧𝗜𝗠𝗘')은 첫 줄에 있을 때만, 그리고 가장 먼저 —
  // 본문의 'full time' 이나 '응원 감사합니다 THANK YOU' 같은 말로 다른 종류가 되지 않게
  const first = (head.split("\n").find((l) => l.trim()) ?? "").trim();
  // 앞에는 꾸밈 이모지/공백/라운드(1R)만, 뒤에는 글자가 바로 붙지 않게 ('FULL TIME까지 응원' 같은 한글 문장은 아님). 'FULL-TIME' 하이픈 허용
  if (/^[\p{Extended_Pictographic}\p{Variation_Selector}\s]*(?:\d+\s*R\s*)?FULL[\s-]?TIME(?![\p{L}\p{N}])/u.test(first)) return "result";
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
  /** '이름 전반 5, 후반 6' 모양 (숫자 = 분). ⚽ 줄이 있으면 쓰지 않는다 */
  scorerLines: string[];
  /** '⚽ 김영록 2, 윤창욱' 모양 (2026-27). ⚽ 줄이 없으면 [], 못 읽는 조각이 있으면 null (득점 일부만 넣지 않는다) */
  ballScorers: Array<[string, number]> | null;
  /** 득점자별 골 수 — ⚽ 줄이 있으면 그것, 없으면 분 표기 줄(엄격 문법). 하나라도 못 읽으면 null */
  goals: Array<[string, number]> | null;
  /** 득점 줄의 자책골(상대 자책) 수 — 합계 검산용 */
  ownGoals: number;
  /** 점수를 쓰지 않는 이유: no-team = 팀 이름 없는 '3 : 2' 만 / many = 팀 점수 줄이 둘 이상(전반/최종 등) */
  scoreIssue: "no-team" | "many" | null;
};

const OWN_GOAL = /^(O\.?G\.?|자책)/i;

/**
 * '⚽ 김영록 2, 윤창욱' / '⚽️ 김영록 2골' / '⚽ GOALS 김영록, 윤창욱' → [이름, 골 수]. 자책골(O.G, 자책)은 ownGoals 로.
 * 골 수는 '골' 이 붙거나 띄어 쓴 숫자만 — '김대현(18)' 의 괄호 숫자는 이름의 일부(등번호). 줄 끝이 쉼표면 다음 줄을 이어 읽는다.
 * 이름(+ 골 수) 모양이 아닌 조각(예: 분 표기 '후반 12′')이 하나라도 있으면 null.
 */
export function ballScorers(lines: readonly string[]): { list: Array<[string, number]>; ownGoals: number } | null {
  // ⚽ 줄 + 쉼표로 끝나면 다음 줄 이어 붙이기
  const joined: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("⚽")) continue;
    let line = lines[i];
    while (/[,，]\s*$/.test(line) && i + 1 < lines.length && !lines[i + 1].startsWith("#")) line += " " + lines[++i].replace(/^(?:⚽️?\s*)+/u, "");
    joined.push(line);
  }
  const out = new Map<string, number>();
  let ownGoals = 0;
  for (const line of joined) {
    // ⚽ 뒤 변형 선택자(U+FE0F)는 글자 그대로 (함수 파일에 이스케이프를 쓰지 않는다, D-076), 머리 단어(GOALS, 득점) 거르기
    const body = line.replace(/^(?:⚽️?\s*)+/u, "").replace(/^(?:GOALS?|득점자?)\s*[:：]?\s*/i, "");
    for (const part of body.split(/[,，]/)) {
      if (!part.trim()) continue;
      const m = /^\s*([가-힣A-Za-z.]+(?:\(\d{1,2}\))?)(?:\s+(\d+)\s*골?|\s*(\d+)\s*골)?\s*$/u.exec(part);
      if (!m) return null;
      const n = Number(m[2] ?? m[3] ?? 1);
      if (OWN_GOAL.test(m[1])) {
        ownGoals += n;
        continue;
      }
      out.set(m[1], (out.get(m[1]) ?? 0) + n);
    }
  }
  return { list: [...out], ownGoals };
}

const HALF = "(?:전반|후반|연장)";
const MINUTE = "'?\\d{1,3}(?:′|분|')?";
const SCORER = "(?:[가-힣]{2,4}|O\\.?G\\.?|자책골?)";
/** '백승하 전반 5, 후반 6, 14' / "O.G 후반 '6" — 이름 뒤에 '전반|후반|연장 N' 과 쉼표만 */
const NAME_FIRST = new RegExp(`^(${SCORER})\\s+${HALF}\\s*${MINUTE}((?:\\s*,\\s*(?:${HALF}\\s*)?${MINUTE})*)$`, "u");
/** '전반 7분 김영록' — 분이 앞, 이름이 뒤 (한 골) */
const MINUTE_FIRST = new RegExp(`^${HALF}\\s*${MINUTE}\\s+(${SCORER})$`, "u");

/**
 * 분 표기 득점 줄(⚽ 없는 글) → [이름, 골 수] + 자책골 수. 엄격 문법(NAME_FIRST / MINUTE_FIRST)만 읽고,
 * 하나라도 못 읽는 줄('(전반 1 : 0)', '후반 12분 김영록 선수의 결승골…' 같은 문장)이 있으면 null — 확실할 때만 쓴다.
 */
export function minuteScorers(lines: readonly string[]): { list: Array<[string, number]>; ownGoals: number } | null {
  const out = new Map<string, number>();
  let ownGoals = 0;
  for (const raw of lines) {
    const line = trimDecor(raw);
    let name: string;
    let n: number;
    const a = NAME_FIRST.exec(line);
    const b = a ? null : MINUTE_FIRST.exec(line);
    if (a && !/^(전반|후반|연장)$/.test(a[1])) {
      name = a[1];
      n = 1 + (a[2].match(/\d{1,3}/g) ?? []).length;
    } else if (b && !/^(전반|후반|연장)$/.test(b[1])) {
      name = b[1];
      n = 1;
    } else return null;
    if (OWN_GOAL.test(name)) ownGoals += n;
    else out.set(name, (out.get(name) ?? 0) + n);
  }
  return { list: [...out], ownGoals };
}

/** 시계 이모지 줄과 날짜(11.15, 11/15)가 든 줄 — 점수 줄 후보에서 뺀다 ('1:15' 같은 점수는 시각으로 보지 않는다) */
const isTimeOrDateLine = (l: string) => /^[⏰⏱⌚🕐-🕧]/u.test(l) || /\d{1,2}\s*[./]\s*\d{1,2}/.test(l);
/** 줄 앞뒤 꾸밈 이모지(🔵 … ⚪️) 떼기 */
const trimDecor = (l: string) => l.replace(/^[\p{Extended_Pictographic}\p{Variation_Selector}\s]+|[\p{Extended_Pictographic}\p{Variation_Selector}\s]+$/gu, "");

/**
 * 경기결과 글 → 상대, 점수, 득점 줄. 예:
 * "⚪15라운드 경기결과🔵\n\n서울은평덴포스 7 : 5 전주시민풋살구단\n\n백승하 전반 5, 후반 6, 14\n윤창욱 전반 11\n\n#서울은평덴포스"
 * 점수 줄 = '팀 N : N 팀' 꼴에 우리 구단이 정확히 한쪽인 줄. 둘 이상이면 쓰지 않고(many), 팀 이름 없는 'N : N' 만 있으면 no-team.
 */
export function parseResult(caption: string): ResultHint {
  const lines = caption.split("\n").map((l) => l.trim()).filter(Boolean);
  const scoreOf = (l: string) => {
    const m = /^(.+?)\s+(\d+)\s*:\s*(\d+)\s+(.+)$/.exec(trimDecor(l));
    if (!m) return null;
    const [left, a, b, right] = [m[1].trim(), Number(m[2]), Number(m[3]), m[4].trim()];
    if (CLUB.test(left) && !CLUB.test(right)) return { line: l, opponent: right, us: a, them: b };
    if (CLUB.test(right) && !CLUB.test(left)) return { line: l, opponent: left, us: b, them: a };
    return null;
  };
  // 전반/HT/하프타임 점수 줄은 최종 점수 후보가 아니다
  const halfTime = (l: string) => /^(전반|HT|H\.T|하프)/i.test(trimDecor(l)) || /\((?:전반|HT|하프)/i.test(l);
  const usable = lines.filter((l) => !isTimeOrDateLine(l) && !halfTime(l));
  const candidates = usable.map(scoreOf).filter((x) => x !== null);
  // 팀 이름 없는 'N : N' 줄 (전반/HT 표시 없는 것)
  const teamless = usable.filter((l) => !scoreOf(l) && /^\D*\d+\s*:\s*\d+\D*$/.test(trimDecor(l)));
  let opponent: string | null = null;
  let scoreUs: number | null = null;
  let scoreThem: number | null = null;
  let scoreIssue: ResultHint["scoreIssue"] = null;
  if (candidates.length === 1 && teamless.length === 0) [opponent, scoreUs, scoreThem] = [candidates[0].opponent, candidates[0].us, candidates[0].them];
  else if (candidates.length >= 1) {
    // 팀 점수 줄이 둘 이상이거나, 팀 줄 하나에 팀 없는 'N : N' 줄이 또 있음 — 어느 것이 최종인지 모른다
    scoreIssue = "many";
    if (candidates.every((c) => c.opponent === candidates[0].opponent)) opponent = candidates[0].opponent;
  } else if (teamless.length > 0) {
    // '3 : 2' 만 있는 줄 — 앞 숫자가 우리인지 홈 기준인지 글만으로 알 수 없다. 틀린 점수보다 비워 두고 확인 필요
    scoreIssue = "no-team";
  }
  // 상대가 '🆚 노원제너FS' 줄에만 있는 모양 (2026-27)
  if (!opponent) {
    const vs = lines.find((l) => l.startsWith("🆚"))?.replace(/^🆚\s*/u, "").trim();
    if (vs && !/\bvs\b/i.test(vs) && !CLUB.test(vs)) opponent = vs;
  }
  // ⚽ 줄이 하나라도 있으면 그것만 (전반/후반 문장 줄은 보지 않는다), 없으면 분 표기 줄
  const hasBall = lines.some((l) => l.startsWith("⚽"));
  const ball = hasBall ? ballScorers(lines) : { list: [], ownGoals: 0 };
  const scoreLine = scoreUs !== null ? candidates[0].line : null;
  const after = scoreLine ? lines.slice(lines.indexOf(scoreLine) + 1) : lines;
  const scorerLines = hasBall ? [] : after.filter((l) => !l.startsWith("#") && /(전반|후반|연장)/.test(l));
  const minute = hasBall ? null : minuteScorers(scorerLines);
  const used = hasBall ? ball : minute;
  return {
    opponent,
    scoreUs,
    scoreThem,
    scorerLines,
    ballScorers: ball ? ball.list : null,
    goals: used ? used.list : null,
    ownGoals: used?.ownGoals ?? 0,
    scoreIssue,
  };
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
