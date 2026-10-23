// 인스타그램 게시물 → 사이트에 넣을 행 (D-065, BR-029) — AI 없이 정해진 규칙으로. 순수 함수만 (테스트: instagram-sync.test.ts).
// 판단이 필요한 값(포지션 없음, 같은 이름, 홈/원정, 경기 못 찾음)은 넣지 않거나 넣은 뒤 note 로 '확인 필요'를 남긴다.
import { kstDateTime, parseMatchday, parseResult, type IgPost, type IgPostType } from "./embed.ts";
import { josa, nameSlug } from "./korean.ts";

export const ACCOUNT = "eunpyeong_denforce";
const SITE = "https://eunpyeong-fs.com";
/** 지금 시즌 리그 대회 이름 — src/config/league.ts 의 LEAGUE.currentCompetition 과 같아야 한다 (테스트로 맞춘다) */
export const LEAGUE_COMPETITION = "2026-27 FK1리그";
/** 기사에 쓰는 리그 이름 */
export const LEAGUE_LABEL = "FK리그 1부(FK1)";

export type Position = "GK" | "FIXO" | "ALA" | "PIVO";
const POSITION_KO: Record<Position, string> = { GK: "골레이로", FIXO: "픽소", ALA: "아라", PIVO: "피보" };
const POSITION_WORD: Record<string, Position> = {
  골레이로: "GK", 골키퍼: "GK", GK: "GK", 픽소: "FIXO", FIXO: "FIXO", 아라: "ALA", ALA: "ALA", 피보: "PIVO", PIVO: "PIVO",
};

export function positionLabel(p: Position): string {
  return `${POSITION_KO[p]}(${p})`;
}

// ── 글 다듬기 ──

/** 글 줄 — 빈 줄과 해시태그만 있는 줄은 뺀다 (#태그#태그 처럼 붙어 있어도 한 번에 판단되는 식 — 되돌아가며 느려지지 않게) */
export function captionLines(caption: string): string[] {
  return caption
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^(?:#[^\s#]+\s*)+$/u.test(l));
}

/** 홈페이지에 넣을 글 — 중간점(·)을 쓰지 않는다 (BR-024) */
export function siteCaption(caption: string): string {
  return caption.replace(/ · /g, " / ").replace(/·/g, "/");
}

/** 이모지·꾸밈 글자 빼기 (𝑾𝑬𝑳𝑪𝑶𝑴𝑬 → WELCOME) */
export function plainText(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** 구단 이름 표기 — 화면에서는 '서울은평 덴포스' */
function clubName(s: string): string {
  return s.replace(/서울\s*은평\s*덴포스/g, "서울은평 덴포스");
}

function cut(s: string, max: number): string {
  const chars = [...s];
  return chars.length <= max ? s : `${chars.slice(0, max - 1).join("")}…`;
}

/** 게시 날짜 (한국 시간 YYYY-MM-DD) */
export function kstDate(unixSeconds: number): string {
  return kstDateTime(unixSeconds).slice(0, 10);
}

/** 시즌 — 5월부터 다음 시즌 (2026-10 → 2026-27, 2026-03 → 2025-26) */
export function seasonOf(date: string): string {
  const [y, m] = date.split("-").map(Number);
  const start = m >= 5 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** 기사 속 날짜 — "19일" */
function dayOf(date: string): string {
  return `${Number(date.slice(8, 10))}일`;
}

// ── 포스팅 (모든 게시물) ──

export type PostingDraft = { kind: "club"; platform: "instagram"; title: string; author: string; excerpt: string; url: string; posted_on: string };

/** 포스팅 — 제목은 첫 줄 (WELCOME·GOOD LUCK·MATCH DAY 처럼 머리말만 있는 글은 둘째 줄까지), 요약은 글 전체 */
export function postingDraft(post: IgPost, type: IgPostType): PostingDraft {
  const lines = captionLines(post.caption);
  const headerOnly = type === "welcome" || type === "farewell" || type === "matchday";
  const title = (headerOnly ? lines.slice(0, 2) : lines.slice(0, 1)).join(" ") || "구단 인스타그램 게시물";
  return {
    kind: "club",
    platform: "instagram",
    title: cut(title, 200),
    author: `@${ACCOUNT}`,
    excerpt: cut(lines.join(" "), 300),
    url: `https://www.instagram.com/p/${post.code}/`,
    posted_on: kstDate(post.takenAt),
  };
}

// ── 구단소식 ──

export type NewsDraft = {
  category: "news" | "video";
  title: string;
  date: string;
  summary: string;
  body: string;
  images: string[];
  thumbnail_url: string | null;
  video_url: string | null;
  published: true;
};

/** 릴스 → 구단영상 (2026-10-17_instagram_reels.sql 과 같은 모양). imageUrl = 올린 표지 주소 */
export function reelNews(post: IgPost, imageUrl: string): NewsDraft {
  const lines = captionLines(post.caption);
  const date = kstDate(post.takenAt);
  // 득점/도움 표시는 첫 줄(제목) 아래에서만 찾는다 — "⚽️ 오늘의 훈련 현장" 같은 제목을 득점자로 읽지 않게
  const after = (mark: RegExp) => {
    const l = lines.slice(1).find((x) => mark.test(x));
    return l ? cut(plainText(l), 40) : "";
  };
  const scorer = after(/^⚽/u);
  const assist = after(/^📦/u);
  const summary = cut([scorer && `득점 ${scorer}`, assist && `도움 ${assist}`].filter(Boolean).join(" / "), 300);
  return {
    category: "video",
    title: cut(plainText(lines[0] ?? "") || `구단 릴스 (${date})`, 120),
    date,
    summary,
    body: `${summary ? `${summary}\n\n` : ""}구단 공식 인스타그램(@${ACCOUNT}) 릴스 (${date})`,
    images: [],
    thumbnail_url: imageUrl,
    video_url: `https://www.instagram.com/reel/${post.code}/`,
    published: true,
  };
}

export type Welcome = { name: string; epithet: string; number: number | null; position: Position | null; quote: string | null };

/** 이름 자리에 올 수 없는 낱말 (alerts.ts STOP 과 같은 뜻) */
const NOT_NAME = new Set(["신규", "신인", "외국인", "새로운", "선수단", "유망주", "여러분", "모두", "모든", "우리", "구단", "골레이로", "골키퍼", "피보", "픽소", "아라"]);

function positionOf(word: string | undefined): Position | null {
  if (!word) return null;
  return POSITION_WORD[word.toUpperCase()] ?? POSITION_WORD[word] ?? null;
}

/**
 * WELCOME 글 — "서울은평덴포스가 지치지 않는 피보 박재희 선수를 영입했습니다."
 * 한 사람만 읽는다. 여러 명("아라 김종호, 피보 박재희 선수를")이나 이름이 아닌 말("신규 선수를")이면 null — 사람이 확인한다.
 */
export function parseWelcome(caption: string): Welcome | null {
  const text = plainText(caption);
  const m = /서울\s*은평\s*덴포스가\s+(.*?)\s*([가-힣]{2,4})\s*선수를\s*영입/.exec(text);
  if (!m || NOT_NAME.has(m[2])) return null;
  let epithet = m[1].trim();
  if (/[,，、]|\s(와|과|및)\s|선수/.test(epithet)) return null;
  const no = /No\.?\s*(\d{1,2})/i.exec(epithet);
  epithet = epithet.replace(/No\.?\s*\d{1,2}/i, "").trim();
  const words = epithet.split(/\s+/).filter(Boolean);
  if (words.filter((w) => positionOf(w)).length > 1) return null;
  // 포지션은 이름 바로 앞 낱말만 ("지치지 않는 피보 박재희")
  const position = positionOf(words[words.length - 1]);
  const q = captionLines(caption)
    .map(plainText)
    .find((l) => /합류로/.test(l));
  const quote = q ? clubName(q).replace(/부탁드립니다\.?$/, "부탁드린다").replace(/\.$/, "") : null;
  return { name: m[2], epithet, number: no ? Number(no[1]) : null, position, quote };
}

/** 영입 기사 (BR-020 기사형, 2026-10-20_instagram_welcome.sql 과 같은 틀). slug = 자동으로 추가한 선수 주소 */
export function welcomeNews(post: IgPost, w: Welcome, imageUrl: string, slug: string | null): NewsDraft {
  const date = kstDate(post.takenAt);
  const season = seasonOf(date);
  const pos = w.position ? POSITION_KO[w.position] : null;
  const title = w.epithet ? `서울은평 덴포스, '${w.epithet}' ${w.name} 영입` : `서울은평 덴포스, ${w.name} 영입`;
  const head = [w.number !== null && `등번호 ${w.number}번`, w.position && positionLabel(w.position)].filter(Boolean).join(" ");
  const summary = `${head ? `${head}, ` : ""}${season} 시즌 ${LEAGUE_LABEL}에서 함께한다`;
  const numberLine =
    w.number !== null ? ` ${josa(w.name, "은는")} ${season} 시즌 등번호 ${w.number}번을 ${pos ? `달고 ${pos} 포지션에서 뛴다.` : "단다."}` : "";
  const profile = [
    `${w.name} 프로필`,
    w.number !== null && `등번호: ${w.number}`,
    w.position && `포지션: ${positionLabel(w.position)}`,
    slug && `${SITE}/team/players/${slug}`,
  ].filter(Boolean);
  const body = [
    `서울은평 덴포스가 ${pos ? `${pos} ` : ""}${josa(w.name, "을를")} 영입했다.`,
    `서울은평 덴포스는 ${dayOf(date)} 구단 공식 SNS를 통해 ${w.epithet ? `'${w.epithet}' ` : ""}${w.name}의 합류 소식을 전했다.${numberLine}`,
    w.quote && `구단은 "${w.quote}"고 밝혔다.`,
    `서울은평 덴포스는 ${season} 시즌 ${LEAGUE_LABEL}에 나선다.`,
    profile.join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
  return { category: "news", title: cut(title, 120), date, summary: cut(summary, 300), body, images: [imageUrl], thumbnail_url: null, video_url: null, published: true };
}

const STAFF_ROLE = "수석코치|골키퍼코치|피지컬코치|코치|감독|트레이너|단장|부단장|매니저";
export type Farewell = { name: string; role: string; transfer: boolean };

/** 떠난다는 말이 분명할 때만 — '동행합니다'(재계약), '잠시 떠나'(대표팀 소집) 같은 글은 작별이 아니다 */
const DEPART = /동행을?\s*마무리|이적(을\s*하며|하며|으로|하게)|작별|팀을\s*떠나게|은퇴/;
const NOT_DEPART = /잠시|동행합니다|동행을\s*이어|함께합니다|재계약|복귀/;

/**
 * GOOD LUCK / THANK YOU 글 — "박영완 선수가 이적을 하며 은평과의 동행을 마무리하게 됐습니다." / "장성호 감독과의 동행을 마무리합니다."
 * 한 사람만 읽는다. 여러 명("박종현, 김성국 선수가")이거나 떠난다는 말이 분명하지 않으면 null — 사람이 확인한다.
 */
export function parseFarewell(caption: string): Farewell | null {
  for (const line of captionLines(caption).map(plainText)) {
    if (!DEPART.test(line) || NOT_DEPART.test(line)) continue;
    const m = new RegExp(`([가-힣]{2,4})\\s*(선수|${STAFF_ROLE})(?:님)?(?:가|이|과|와|과의|와의)?\\s`).exec(line);
    if (!m || NOT_NAME.has(m[1])) continue;
    if (/[가-힣]{2,4}\s*(,|，|、|와|과|및)\s*$/.test(line.slice(0, m.index))) return null;
    return { name: m[1], role: m[2], transfer: /이적/.test(line) };
  }
  return null;
}

/** 작별 기사. position = 선수단에서 찾은 포지션 (한 명일 때만) */
export function farewellNews(post: IgPost, f: Farewell, imageUrl: string, position: Position | null): NewsDraft {
  const date = kstDate(post.takenAt);
  const base = { category: "news" as const, date, images: [imageUrl], thumbnail_url: null, video_url: null, published: true as const };
  if (f.role !== "선수") {
    const who = `${f.name} ${f.role}`;
    return {
      ...base,
      title: cut(`서울은평 덴포스, ${josa(who, "과와")} 동행 마무리`, 120),
      summary: `구단 공식 SNS로 ${josa(who, "과와")}의 작별 소식을 전했다`,
      body: [`서울은평 덴포스가 ${josa(who, "과와")}의 동행을 마무리했다.`, `서울은평 덴포스는 ${dayOf(date)} 구단 공식 SNS를 통해 작별 소식을 전하며 앞날을 응원했다.`].join("\n\n"),
    };
  }
  const who = position ? `${POSITION_KO[position]} ${f.name}` : f.name;
  return {
    ...base,
    title: cut(f.transfer ? `${f.name}, 이적으로 서울은평 덴포스와 동행 마무리` : `${f.name}, 서울은평 덴포스와 동행 마무리`, 120),
    summary: f.transfer ? `${who}, 새 팀에서 새로운 도전` : `${who}, 서울은평 덴포스와 작별`,
    body: [
      `서울은평 덴포스 ${josa(who, "이가")} ${f.transfer ? "이적하며 " : ""}팀과의 동행을 마무리했다.`,
      `서울은평 덴포스는 ${dayOf(date)} 구단 공식 SNS를 통해 ${f.name}의 ${f.transfer ? "이적" : "작별"} 소식을 전하며 그의 앞날을 응원했다.`,
    ].join("\n\n"),
  };
}

// ── 선수단 ──

export type RosterPlayer = { id: string; name: string; is_active: boolean; position: string; slug: string };
export type NewPlayer = { slug: string; name: string; position: Position };

/** 영입 → 선수 추가 여부. 포지션이 글에 없거나 같은 이름이 있으면 추가하지 않고 확인을 남긴다 (BR-025 동명이인) */
export function planWelcome(w: Welcome, roster: readonly RosterPlayer[]): { add: NewPlayer | null; note: string | null } {
  const same = roster.filter((p) => p.name === w.name);
  if (same.length) {
    const state = same.some((p) => p.is_active) ? "활동 중인" : "활동이 꺼진";
    return { add: null, note: `${state} 같은 이름 선수(${w.name})가 있어 선수는 추가하지 않음 — 동명이인이면 관리자 › 선수에서 추가, 복귀면 활동 켜기` };
  }
  if (!w.position) return { add: null, note: `글에 포지션이 없어 선수는 추가하지 않음 — 관리자 › 선수에서 ${w.name} 추가` };
  const base = nameSlug(w.name);
  if (!base) return { add: null, note: `선수 주소를 만들지 못함 — 관리자 › 선수에서 ${w.name} 추가` };
  const taken = new Set(roster.map((p) => p.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return { add: { slug, name: w.name, position: w.position }, note: null };
}

/**
 * 작별 → 활동 끄기 (같은 이름 활동 선수가 딱 한 명일 때만) + 작별 기사 여부.
 * 선수를 못 찾거나 여럿이면 기사도 넣지 않는다 (잘못 읽은 글로 엉뚱한 기사가 나가지 않게). 스태프는 기사만, 명단은 직접 정리.
 * 활동을 자동으로 끈 것은 다른 사람일 수 있어 확인 메모를 남긴다.
 */
export function planFarewell(f: Farewell, roster: readonly RosterPlayer[]): { deactivate: RosterPlayer | null; publish: boolean; note: string | null } {
  if (f.role !== "선수") return { deactivate: null, publish: true, note: `${f.name} ${f.role} — 관리자 › 코칭스태프에서 정리` };
  const active = roster.filter((p) => p.is_active && p.name === f.name);
  if (active.length === 1) return { deactivate: active[0], publish: true, note: `${f.name} 선수 활동을 자동으로 껐음 — 다른 사람이면 관리자 › 선수에서 다시 켜기` };
  if (active.length === 0) return { deactivate: null, publish: false, note: `활동 선수 중 ${f.name}을(를) 찾지 못해 기사도 넣지 않음 — 선수단 확인` };
  return { deactivate: null, publish: false, note: `같은 이름 활동 선수 ${active.length}명(${f.name}) — 관리자 › 선수에서 직접 활동 끄기, 기사는 직접 쓰기` };
}

// ── 경기 ──

export type MatchLite = { id: string; kickoff: string; opponent: string; status: string; score_us: number | null; score_them: number | null; venue?: string };
export type MatchDraft = { competition: string; round: string; kickoff: string; venue: string; is_home: boolean; opponent: string; status: "scheduled" };

/** 팀 이름 비교 — 띄어쓰기·대소문자 무시 */
export function sameTeam(a: string, b: string): boolean {
  const n = (s: string) => s.replace(/\s+/g, "").toLowerCase();
  return n(a) === n(b);
}

/** 대회/라운드 줄 → 대회 이름·라운드 ("15라운드" → 리그 15R, "2026 FK CUP 3R", "PLAYOFF") */
export function competitionOf(heading: string, date: string): { competition: string; round: string } {
  const season = seasonOf(date);
  const year = date.slice(0, 4);
  // \b 는 한글 뒤에서 동작하지 않아 '라운드' 는 그대로, 'R' 은 뒤에 영문이 없을 때만
  const round = /(\d+)\s*(?:라운드|R(?![a-z]))/i.exec(heading)?.[1];
  const r = round ? `${round}R` : "";
  if (/FK\s*CUP/i.test(heading)) return { competition: `${year} FK CUP`, round: r };
  if (/FA\s*컵/i.test(heading)) return { competition: `${year} FA컵`, round: r };
  if (/PLAY\s*OFF|플레이오프/i.test(heading)) return { competition: `${season} 승강 플레이오프`, round: "" };
  if (round) return { competition: `${season} ${LEAGUE_COMPETITION.split(" ").slice(1).join(" ")}`, round: r };
  return { competition: cut(heading || "경기", 60), round: "" };
}

/** MATCH DAY → 경기 일정. 같은 날 경기가 이미 있으면 넣지 않는다 */
export function planMatchday(post: IgPost, matches: readonly MatchLite[]): { insert: MatchDraft | null; note: string | null } {
  const hint = parseMatchday(post.caption);
  const date = kstDate(post.takenAt);
  if (!hint.opponent || !hint.time) return { insert: null, note: "MATCH DAY 글에서 상대/시간을 읽지 못함 — 관리자 › 경기에서 입력" };
  const kickoff = `${date}T${hint.time.padStart(5, "0")}:00+09:00`;
  const sameDay = matches.filter((m) => kstDateTime(Date.parse(m.kickoff) / 1000).slice(0, 10) === date);
  const same = sameDay.find((m) => sameTeam(m.opponent, hint.opponent!));
  if (same) {
    // 이미 있는 경기 — 시간/경기장이 글과 다르면 알린다 (고치지는 않음)
    const time = kstDateTime(Date.parse(same.kickoff) / 1000).slice(11, 16);
    const diff = [time !== hint.time && `시간 ${time} → 글 ${hint.time}`, hint.venue && same.venue !== undefined && same.venue !== hint.venue && `경기장 ${same.venue || "없음"} → 글 ${hint.venue}`].filter(Boolean);
    return { insert: null, note: diff.length ? `이미 있는 ${hint.opponent} 경기와 다름 (${diff.join(", ")}) — 관리자 › 경기에서 확인` : null };
  }
  if (sameDay.length) return { insert: null, note: `${date}에 다른 상대(${sameDay[0].opponent}) 경기가 이미 있음 — 글의 상대는 ${hint.opponent}, 확인 필요` };
  const venue = cut(hint.venue ?? "", 60);
  const isHome = /은평/.test(venue);
  const { competition, round } = competitionOf(hint.heading, date);
  return {
    insert: { competition, round, kickoff, venue, is_home: isHome, opponent: cut(hint.opponent, 40), status: "scheduled" },
    note: isHome ? null : `원정 경기로 넣음 (경기장: ${venue || "없음"}) — 중립/홈 경기면 관리자 › 경기에서 고치기`,
  };
}

/** 득점 줄 → "백승하 3, 김영록, 윤창욱" (자책골 제외, 한 골이면 숫자 없음) */
export function scorersText(lines: readonly string[]): string | null {
  const goals = new Map<string, number>();
  for (const line of lines) {
    const name = line.split(/\s+/)[0];
    if (!name || /^(O\.?G\.?|자책)/i.test(name)) continue;
    const n = (line.slice(name.length).match(/\d+/g) ?? []).length || 1;
    goals.set(name, (goals.get(name) ?? 0) + n);
  }
  if (!goals.size) return null;
  return cut([...goals].map(([name, n]) => (n > 1 ? `${name} ${n}` : name)).join(", "), 300);
}

export type ResultUpdate = { id: string; status: "finished"; score_us: number; score_them: number; scorers: string | null };

/** 경기결과 → 최근 7일 안 같은 상대 경기에 점수/득점. 이미 결과가 있으면 그대로 둔다 */
export function planResult(post: IgPost, matches: readonly MatchLite[]): { update: ResultUpdate | null; note: string | null } {
  const r = parseResult(post.caption);
  if (!r.opponent || r.scoreUs === null || r.scoreThem === null) return { update: null, note: "경기결과 글에서 상대/점수를 읽지 못함 — 관리자 › 경기에서 입력" };
  const at = post.takenAt * 1000;
  const found = matches
    .filter((m) => sameTeam(m.opponent, r.opponent!) && Date.parse(m.kickoff) <= at + 3_600_000 && Date.parse(m.kickoff) >= at - 7 * 86_400_000)
    .sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff))[0];
  const score = `${r.scoreUs}:${r.scoreThem}`;
  if (!found) return { update: null, note: `최근 7일 안 ${r.opponent} 경기를 찾지 못함 (결과 ${score}) — 관리자 › 경기에서 입력` };
  if (found.status === "finished") {
    const same = found.score_us === r.scoreUs && found.score_them === r.scoreThem;
    return { update: null, note: same ? null : `이미 입력된 결과(${found.score_us}:${found.score_them})와 글(${score})이 다름 — 확인 필요` };
  }
  return { update: { id: found.id, status: "finished", score_us: r.scoreUs, score_them: r.scoreThem, scorers: scorersText(r.scorerLines) }, note: null };
}
