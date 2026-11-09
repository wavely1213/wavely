// 피그마 포스터용 공개 데이터 변환 단위 테스트 (D-066, docs/FIGMA_SYNC.md 약속 B) — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { absoluteUrl, buildFigmaFeed, rosterPeople, toFeedResult } from "../src/lib/figma-feed.ts";
import type { Match, NewsPost, Player, Sponsor, Staff } from "../src/types/index.ts";

const SITE_URL = "https://eunpyeong-fs.com";
const CLUB = "서울은평 덴포스";

const match = (over: Partial<Match>): Match => ({
  id: "m",
  competition: "2026-27 FK1리그",
  round: "3R",
  kickoff: "2026-11-15T15:00:00+09:00",
  venue: "은평다목적체육관",
  isHome: true,
  opponent: "용인지솔FS",
  status: "scheduled",
  score: null,
  highlightUrl: null,
  replayUrl: null,
  scorers: null,
  ...over,
});

const post = (over: Partial<NewsPost>): NewsPost => ({
  id: "n",
  category: "news",
  title: "",
  date: "2026-11-01",
  thumbnail: null,
  images: [],
  summary: "",
  body: [],
  videoUrl: null,
  featured: false,
  ...over,
});

const player = (over: Partial<Player>): Player => ({
  id: "p",
  slug: "p",
  number: null,
  name: "",
  position: "ALA",
  photo: null,
  birth: "2000-01-01",
  heightCm: 175,
  stats: { apps: 0, goals: 0, assists: 0 },
  ...over,
});

test("absoluteUrl: 사이트 경로는 공식 주소를 붙이고, http(s)는 그대로, 그 밖은 null", () => {
  assert.equal(absoluteUrl("/brand/emblem.png", SITE_URL), "https://eunpyeong-fs.com/brand/emblem.png");
  assert.equal(absoluteUrl("https://x.supabase.co/a.jpg", SITE_URL), "https://x.supabase.co/a.jpg");
  assert.equal(absoluteUrl("", SITE_URL), null);
  assert.equal(absoluteUrl(null, SITE_URL), null);
  assert.equal(absoluteUrl("javascript:alert(1)", SITE_URL), null);
});

test("toFeedResult: 원정 경기는 홈팀(상대) 점수 먼저, 승/무/패 글자, 점수 없으면 null", () => {
  const r = toFeedResult(match({ isHome: false, status: "finished", score: { us: 3, them: 2 }, scorers: "원해연 2, 김민성" }), CLUB);
  assert.ok(r);
  assert.equal(r.homeTeam, "용인지솔FS");
  assert.equal(r.awayTeam, CLUB);
  assert.equal(r.score, "2 : 3");
  assert.deepEqual([r.homeScore, r.awayScore, r.scoreUs, r.scoreThem], [2, 3, 3, 2]);
  assert.equal(r.result, "W");
  assert.equal(r.resultLabel, "승");
  assert.equal(r.homeAway, "AWAY");
  assert.equal(r.scorers, "원해연 2, 김민성");
  assert.equal(toFeedResult(match({ status: "finished" }), CLUB), null);
});

test("rosterPeople: 영입/작별을 나누고, 같은 사람은 최근 소식 하나만, 기간 밖 소식은 뺀다", () => {
  const posts = [
    post({ id: "1", title: "서울은평 덴포스, 아라 김선빈 영입", date: "2026-10-20", thumbnail: "/photos/a.jpg" }),
    post({ id: "2", title: "박종현, 이적으로 서울은평 덴포스와 동행 마무리", date: "2026-10-25" }),
    post({ id: "3", title: "서울은평 덴포스, 김기범 수석코치 영입", date: "2026-10-22" }),
    post({ id: "4", title: "서울은평 덴포스, 아라 김선빈 영입", date: "2026-09-01" }), // 같은 사람 옛 소식
    post({ id: "5", title: "서울은평 덴포스, 피보 홍길동 영입", date: "2026-01-01" }), // 기간 밖
    post({ id: "6", title: "서울은평 덴포스, 아라 이몽룡 영입", date: "2026-10-21", category: "notice" }), // 구단뉴스 아님
  ];
  const players = [player({ name: "김선빈", number: 7, position: "ALA", photo: "https://x.supabase.co/k.jpg" })];
  const staff: Staff[] = [{ id: "s", role: "수석코치", name: "김기범", photo: null }];
  const { signings, farewells } = rosterPeople({ posts, players, staff, since: "2026-05-13", siteUrl: SITE_URL });

  assert.deepEqual(
    signings.map((s) => [s.playerName, s.isStaff, s.newsDate]),
    [
      ["김기범", true, "2026-10-22"],
      ["김선빈", false, "2026-10-20"],
    ],
  );
  const kim = signings[1];
  assert.equal(kim.playerNumber, "7");
  assert.equal(kim.position, "ALA");
  assert.equal(kim.positionLabel, "아라");
  assert.equal(kim.playerPhoto, "https://x.supabase.co/k.jpg");
  assert.equal(kim.newsUrl, "https://eunpyeong-fs.com/news/news/1");
  assert.equal(kim.newsImage, "https://eunpyeong-fs.com/photos/a.jpg");
  assert.equal(signings[0].positionLabel, "수석코치");
  // 떠난 선수는 활동 명단에 없다 — 이름만
  assert.deepEqual(farewells.map((f) => [f.playerName, f.playerNumber, f.playerPhoto]), [["박종현", "", null]]);
});

test("rosterPeople: 같은 이름 활동 선수가 둘이면(BR-025) 선수 정보를 붙이지 않는다", () => {
  const { signings } = rosterPeople({
    posts: [post({ title: "서울은평 덴포스, 피보 김대현 영입" })],
    players: [player({ id: "a", name: "김대현", number: 8 }), player({ id: "b", name: "김대현", number: 18 })],
    staff: [],
    since: "2026-01-01",
    siteUrl: SITE_URL,
  });
  assert.equal(signings[0].playerNumber, "");
  assert.equal(signings[0].position, "");
});

test("buildFigmaFeed: 다음 경기는 상태값으로(BR-003) 가장 가까운 예정, 결과는 가장 최근 종료, 개인정보 없음", () => {
  const sponsors: Sponsor[] = [
    { id: "a", name: "은평구", tier: "official", logo: "/brand/x.png", url: null },
    { id: "b", name: "덴포스스포츠", tier: "naming", logo: null, url: "https://example.com" },
  ];
  const feed = buildFigmaFeed({
    now: new Date("2026-11-09T03:00:00Z"),
    siteUrl: SITE_URL,
    clubName: CLUB,
    clubNameEn: "SEOUL EUNPYEONG DENFORCE FUTSAL TEAM",
    emblem: "/brand/emblem.png",
    matches: [
      match({ id: "late", kickoff: "2026-11-29T15:00:00+09:00" }),
      match({ id: "old", status: "finished", kickoff: "2026-10-01T15:00:00+09:00", score: { us: 1, them: 1 } }),
      match({ id: "next", kickoff: "2026-11-15T15:00:00+09:00", isHome: false, opponent: "고양불스" }),
      match({ id: "recent", status: "finished", kickoff: "2026-11-01T15:00:00+09:00", score: { us: 0, them: 2 } }),
      // 날짜는 지났지만 아직 '예정' 상태 — 상태값으로 판단하므로 다음 경기로 본다
      match({ id: "stale", kickoff: "2026-11-02T15:00:00+09:00", status: "scheduled" }),
    ],
    news: [post({ title: "서울은평 덴포스, 아라 김선빈 영입", date: "2026-10-20" })],
    players: [player({ name: "김선빈", number: 7 })],
    staff: [],
    sponsors,
  });

  assert.equal(feed.version, 1);
  assert.equal(feed.generatedAt, "2026-11-09T03:00:00.000Z");
  assert.deepEqual(feed.club, {
    clubName: CLUB,
    clubNameEn: "SEOUL EUNPYEONG DENFORCE FUTSAL TEAM",
    clubEmblem: "https://eunpyeong-fs.com/brand/emblem.png",
    clubUrl: SITE_URL,
  });
  assert.equal(feed.nextMatch?.matchId, "stale");
  assert.equal(feed.lastResult?.matchId, "recent");
  assert.equal(feed.lastResult?.resultLabel, "패");
  assert.deepEqual(
    feed.sponsors.map((s) => [s.sponsorName, s.sponsorTierLabel, s.sponsorLogo]),
    [
      ["덴포스스포츠", "네이밍 스폰서", null],
      ["은평구", "메인 스폰서", "https://eunpyeong-fs.com/brand/x.png"],
    ],
  );
  assert.equal(feed.recentSignings[0].playerNumber, "7");
  // 생년월일/키 같은 개인정보는 피드에 들어가지 않는다
  const text = JSON.stringify(feed);
  assert.equal(text.includes("2000-01-01"), false);
  assert.equal(text.includes("heightCm"), false);
});

test("buildFigmaFeed: 다음 경기의 날짜/시간 글자 (한국 시간), 라벨에 중간점 없음 (BR-024)", () => {
  const feed = buildFigmaFeed({
    now: new Date("2026-11-09T03:00:00Z"),
    siteUrl: SITE_URL,
    clubName: CLUB,
    clubNameEn: "",
    emblem: "/brand/emblem.png",
    matches: [match({ kickoff: "2026-11-15T06:00:00Z" })],
    news: [],
    players: [],
    staff: [],
    sponsors: [],
  });
  const m = feed.nextMatch;
  assert.ok(m);
  assert.equal(m.date, "2026-11-15 (일)");
  assert.equal(m.time, "15:00");
  assert.equal(m.matchLabel, "2026-27 FK1리그 / 3R");
  assert.equal(m.homeTeam, CLUB);
  assert.equal(JSON.stringify(feed).includes("·"), false);
  assert.equal(feed.lastResult, null);
});
