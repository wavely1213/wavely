// 피그마 포스터용 공개 데이터 (D-066, docs/FIGMA_SYNC.md 약속 B) — GET /api/figma/feed 가 이 모양을 그대로 낸다.
// 순수 함수만 (테스트: figma-feed.test.ts). 이미 홈페이지에 공개된 정보만 담는다 — 비공개 글/관리자 정보/개인정보(생년월일 등) 없음.
// 각 객체의 열쇠 이름 = 피그마 포스터 템플릿의 레이어 이름('#opponent' 의 'opponent'). 값은 포스터에 바로 넣을 글자.
import type { Match, NewsPost, Player, Position, Sponsor, SponsorTier, Staff } from "@/types";
import { parseRosterNews } from "./admin/alerts.ts";
import { POSITION_LABEL } from "../data/people.ts";
import { SPONSOR_TIER_LABEL } from "../data/sponsors.ts";
import { formatKickoffFull, matchResult, matchSides, RESULT_LABEL } from "./format.ts";
import { matchLabel } from "./match.ts";
import { sortByTier } from "./sponsors.ts";

/** 응답 모양이 바뀌면 올린다 — 플러그인이 모르는 판이면 알려 준다 */
export const FIGMA_FEED_VERSION = 1;

/** 영입/작별 소식을 볼 기간(일) — 관리자 알림(ROSTER_NEWS_DAYS)과 같은 반년 */
export const FEED_PEOPLE_DAYS = 180;
/** 영입/작별 최대 인원 */
export const FEED_PEOPLE_MAX = 10;

export type FeedClub = {
  clubName: string;
  clubNameEn: string;
  /** 엠블럼 전체 그림 (절대 주소) */
  clubEmblem: string;
  clubUrl: string;
};

export type FeedMatch = {
  matchId: string;
  competition: string;
  round: string;
  /** '2026-27 FK1리그 / 3R' — 라운드가 없으면 대회명만 */
  matchLabel: string;
  opponent: string;
  isHome: boolean;
  /** 'HOME' / 'AWAY' */
  homeAway: "HOME" | "AWAY";
  /** 홈팀이 왼쪽 (BR-002) */
  homeTeam: string;
  awayTeam: string;
  /** ISO 8601 (원본) */
  kickoff: string;
  /** '2026-11-15 (토)' (한국 시간) */
  date: string;
  /** '15:00' (한국 시간) */
  time: string;
  venue: string;
};

export type FeedResult = FeedMatch & {
  scoreUs: number;
  scoreThem: number;
  homeScore: number;
  awayScore: number;
  /** '3 : 2' — 홈팀 점수 먼저 */
  score: string;
  result: "W" | "D" | "L";
  /** '승' / '무' / '패' */
  resultLabel: string;
  /** 우리 팀 득점자 한 줄 (없으면 '') */
  scorers: string;
};

export type FeedPerson = {
  playerName: string;
  /** 등번호 (없으면 '') */
  playerNumber: string;
  /** 'GK' / 'FIXO' / 'ALA' / 'PIVO', 스태프나 모르면 '' */
  position: string;
  /** '아라' 등, 스태프면 직책('수석코치'), 모르면 '' */
  positionLabel: string;
  /** 선수/스태프 사진 (절대 주소, 없으면 null) */
  playerPhoto: string | null;
  isStaff: boolean;
  newsTitle: string;
  /** 'YYYY-MM-DD' */
  newsDate: string;
  newsUrl: string;
  /** 소식 대표 사진 (절대 주소, 없으면 null) */
  newsImage: string | null;
};

export type FeedSponsor = {
  sponsorName: string;
  sponsorTier: SponsorTier;
  /** '메인 스폰서' 등 */
  sponsorTierLabel: string;
  /** 로고 (절대 주소, 없으면 null) */
  sponsorLogo: string | null;
};

export type FigmaFeed = {
  version: number;
  /** 만든 시각 (ISO) — 캐시 1분 */
  generatedAt: string;
  club: FeedClub;
  /** 다음 경기 (예정 경기 중 가장 가까운, 홈/원정 모두) — 없으면 null */
  nextMatch: FeedMatch | null;
  /** 가장 최근 끝난 경기 — 없으면 null */
  lastResult: FeedResult | null;
  /** 최근 영입 (WELCOME) — 최근 소식 먼저 */
  recentSignings: FeedPerson[];
  /** 최근 작별 (GOOD LUCK) — 최근 소식 먼저 */
  recentFarewells: FeedPerson[];
  /** 등급 순서 (높은 등급 먼저) */
  sponsors: FeedSponsor[];
};

/** 사이트 안 경로('/brand/emblem.png')는 공식 주소를 붙이고, http(s) 주소는 그대로. 그 밖은 null */
export function absoluteUrl(url: string | null | undefined, siteUrl: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${siteUrl.replace(/\/$/, "")}${url}`;
  return null;
}

export function toFeedMatch(m: Match, clubName: string): FeedMatch {
  const { home, away } = matchSides(m, clubName);
  const { date, time } = formatKickoffFull(m.kickoff);
  return {
    matchId: m.id,
    competition: m.competition,
    round: m.round,
    matchLabel: matchLabel(m),
    opponent: m.opponent,
    isHome: m.isHome,
    homeAway: m.isHome ? "HOME" : "AWAY",
    homeTeam: home,
    awayTeam: away,
    kickoff: m.kickoff,
    date,
    time,
    venue: m.venue,
  };
}

/** 끝난 경기 → 결과. 점수가 없으면(입력 전) null */
export function toFeedResult(m: Match, clubName: string): FeedResult | null {
  const result = matchResult(m);
  if (!m.score || !result) return null;
  const { score } = matchSides(m, clubName);
  const [homeScore, awayScore] = score ?? [0, 0];
  return {
    ...toFeedMatch(m, clubName),
    scoreUs: m.score.us,
    scoreThem: m.score.them,
    homeScore,
    awayScore,
    score: `${homeScore} : ${awayScore}`,
    result,
    resultLabel: RESULT_LABEL[result],
    scorers: m.scorers ?? "",
  };
}

/** 제목의 포지션 낱말 → 포지션 ('… 아라 김선빈 영입' 의 '아라') */
const POSITION_BY_LABEL: Record<string, Position> = Object.fromEntries(
  (Object.entries(POSITION_LABEL) as Array<[Position, string]>).map(([pos, label]) => [label, pos]),
);

/** 제목에서 이름 바로 앞의 포지션 낱말 → 포지션. 없으면 null */
export function titlePositionBefore(title: string, name: string): Position | null {
  const labels = Object.keys(POSITION_BY_LABEL).join("|");
  const m = new RegExp(`(${labels})\\s+(?:선수\\s+)?${name}(?![가-힣])`).exec(title);
  return m ? POSITION_BY_LABEL[m[1]] : null;
}

/**
 * 구단뉴스 제목(영입/작별)에서 사람 목록 — 소식 하나에 한 사람 (열쇠는 소식 id). 최근 소식 먼저.
 * 같은 이름이 여러 소식에 나와도 모두 남긴다 — 동명이인이 실제로 있어서(BR-025, 김종호/김대현) 이름으로 합치면 다른 사람 소식이 사라진다.
 * 명단 정보(등번호/포지션/사진)는 '그 소식의 사람'이 확실할 때만 붙인다:
 * - 작별: 붙이지 않는다 — 떠난 선수는 이미 명단에서 빠졌고, 남은 같은 이름 선수는 다른 사람이다
 * - 선수 영입: 제목에서 이름 바로 앞 포지션 낱말(골레이로/픽소/아라/피보)이 그 선수 포지션과 같고, 그런 활동 선수가 딱 한 명일 때
 * - 스태프 영입: 제목에 '이름 직책'이 그대로 있고, 그런 스태프가 딱 한 명일 때
 */
export function rosterPeople(input: {
  posts: NewsPost[];
  players: Player[];
  staff: Staff[];
  since: string;
  siteUrl: string;
}): { signings: FeedPerson[]; farewells: FeedPerson[] } {
  const posts = input.posts
    .filter((p) => p.category === "news" && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date >= input.since)
    .sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set<string>();
  const signings: FeedPerson[] = [];
  const farewells: FeedPerson[] = [];
  for (const post of posts) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    const e = parseRosterNews(post.title);
    if (!e) continue;
    const person: FeedPerson = {
      playerName: e.name,
      playerNumber: "",
      position: "",
      positionLabel: "",
      playerPhoto: null,
      isStaff: e.staff,
      newsTitle: post.title,
      newsDate: post.date,
      newsUrl: `${input.siteUrl.replace(/\/$/, "")}/news/${post.category}/${post.id}`,
      newsImage: absoluteUrl(post.thumbnail ?? post.images[0], input.siteUrl),
    };
    if (e.kind === "join" && e.staff) {
      const same = input.staff.filter((s) => s.name.trim() === e.name && post.title.includes(`${e.name} ${s.role.trim()}`));
      if (same.length === 1) {
        person.positionLabel = same[0].role;
        person.playerPhoto = absoluteUrl(same[0].photo, input.siteUrl);
      }
    } else if (e.kind === "join") {
      const pos = titlePositionBefore(post.title, e.name);
      const same = pos ? input.players.filter((p) => p.name.trim() === e.name && p.position === pos) : [];
      if (same.length === 1) {
        const p = same[0];
        person.playerNumber = p.number == null ? "" : String(p.number);
        person.position = p.position;
        person.positionLabel = POSITION_LABEL[p.position];
        person.playerPhoto = absoluteUrl(p.photo, input.siteUrl);
      }
    }
    (e.kind === "join" ? signings : farewells).push(person);
  }
  return { signings: signings.slice(0, FEED_PEOPLE_MAX), farewells: farewells.slice(0, FEED_PEOPLE_MAX) };
}

export function toFeedSponsors(sponsors: Sponsor[], siteUrl: string): FeedSponsor[] {
  return sortByTier(sponsors).map((s) => ({
    sponsorName: s.name,
    sponsorTier: s.tier,
    sponsorTierLabel: SPONSOR_TIER_LABEL[s.tier],
    sponsorLogo: absoluteUrl(s.logo, siteUrl),
  }));
}

/** 'YYYY-MM-DD' (한국 날짜) */
export function kstDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** YYYY-MM-DD 에서 days 일 전 */
function daysBefore(today: string, days: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * 피드 전체. matches 는 아무 순서나 (안에서 시작 시각으로 정렬), 상태값으로 예정/종료를 나눈다 (BR-003).
 */
export function buildFigmaFeed(input: {
  now: Date;
  siteUrl: string;
  clubName: string;
  clubNameEn: string;
  emblem: string;
  matches: Match[];
  news: NewsPost[];
  players: Player[];
  staff: Staff[];
  sponsors: Sponsor[];
}): FigmaFeed {
  const { siteUrl, clubName } = input;
  const sorted = [...input.matches].sort((a, b) => a.kickoff.localeCompare(b.kickoff));
  const next = sorted.find((m) => m.status === "scheduled");
  const last = sorted.filter((m) => m.status === "finished" && m.score).at(-1);
  const people = rosterPeople({
    posts: input.news,
    players: input.players,
    staff: input.staff,
    since: daysBefore(kstDate(input.now), FEED_PEOPLE_DAYS),
    siteUrl,
  });
  return {
    version: FIGMA_FEED_VERSION,
    generatedAt: input.now.toISOString(),
    club: {
      clubName,
      clubNameEn: input.clubNameEn,
      clubEmblem: absoluteUrl(input.emblem, siteUrl) ?? input.emblem,
      clubUrl: siteUrl,
    },
    nextMatch: next ? toFeedMatch(next, clubName) : null,
    lastResult: last ? toFeedResult(last, clubName) : null,
    recentSignings: people.signings,
    recentFarewells: people.farewells,
    sponsors: toFeedSponsors(input.sponsors, siteUrl),
  };
}
