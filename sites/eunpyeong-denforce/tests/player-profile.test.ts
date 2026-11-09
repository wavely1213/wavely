// 선수 상세(프로필 칸·시즌 합류·검색 설명) 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { findPlayerJoin, findPlayerNews, linksToPlayer, mentionsName, playerDescription, profileRows, seasonLabel, seasonStartYear, statsSeasonStartYear } from "../src/lib/player-profile.ts";
import type { NewsPost, Player } from "../src/types/index.ts";

const post = (id: string, title: string, date: string, category: NewsPost["category"] = "news"): NewsPost => ({
  id, category, title, date, thumbnail: null, images: [], summary: "", body: [], videoUrl: null, featured: false,
});
const player = (over: Partial<Player> = {}): Player => ({
  id: "p", slug: "kang-minwon", number: null, name: "강민원", position: "ALA", photo: null, birth: null, heightCm: null,
  stats: { apps: 0, goals: 0, assists: 0 }, ...over,
});
const STATS = "2025-26 FK1리그";

test("seasonStartYear / seasonLabel / statsSeasonStartYear", () => {
  assert.equal(seasonStartYear("2026-10-16"), 2026);
  assert.equal(seasonStartYear("2026-05-01"), 2026);
  assert.equal(seasonStartYear("2026-04-30"), 2025);
  assert.equal(seasonStartYear("2027-02-01"), 2026);
  assert.equal(seasonStartYear("2026"), null);
  assert.equal(seasonStartYear(""), null);
  assert.equal(seasonLabel(2026), "2026-27");
  assert.equal(seasonLabel(2099), "2099-00");
  assert.equal(statsSeasonStartYear(STATS), 2025);
  assert.equal(statsSeasonStartYear("FK1리그"), null);
});

test("findPlayerJoin: 기록 시즌 뒤 영입 소식 → 시즌 + 글", () => {
  const posts = [post("a", "서울은평 덴포스, '거침없는 질주' 강민원 영입", "2026-10-16"), post("b", "다른 소식", "2026-10-10")];
  assert.deepEqual(findPlayerJoin({ name: "강민원", sameNameCount: 1, posts, statsSeason: STATS }), { season: "2026-27", post: posts[0] });
});

test("findPlayerJoin: 없음 — 다른 이름·스태프·구단뉴스 아님·기록 시즌 안 영입·날짜 모름", () => {
  const find = (posts: NewsPost[], name = "강민원") => findPlayerJoin({ name, sameNameCount: 1, posts, statsSeason: STATS });
  assert.equal(find([post("a", "서울은평 덴포스, 골레이로 임우성 영입", "2026-10-16")]), null);
  assert.equal(find([post("a", "서울은평 덴포스, '젊은 지략가' 김기범 수석코치 영입", "2026-10-07")], "김기범"), null);
  assert.equal(find([post("a", "서울은평 덴포스, '거침없는 질주' 강민원 영입", "2026-10-16", "photo")]), null);
  assert.equal(find([post("a", "서울은평 덴포스, '거침없는 질주' 강민원 영입", "2025-11-01")]), null);
  assert.equal(find([post("a", "서울은평 덴포스, '거침없는 질주' 강민원 영입", "2026")]), null);
  assert.equal(find([]), null);
});

test("findPlayerJoin: 가장 최근 인사 소식이 이적이면 없음, 같은 이름 선수가 둘이면 없음 (BR-025)", () => {
  const joinThenLeave = [
    post("b", "강민원, 이적으로 서울은평 덴포스와 동행 마무리", "2027-03-01"),
    post("a", "서울은평 덴포스, '거침없는 질주' 강민원 영입", "2026-10-16"),
  ];
  assert.equal(findPlayerJoin({ name: "강민원", sameNameCount: 1, posts: joinThenLeave, statsSeason: STATS }), null);
  const join = [post("a", "서울은평 덴포스, '거침없는 질주' 강민원 영입", "2026-10-16")];
  assert.equal(findPlayerJoin({ name: "강민원", sameNameCount: 2, posts: join, statsSeason: STATS }), null);
  assert.equal(findPlayerJoin({ name: "강민원", sameNameCount: 1, posts: join, statsSeason: "기록 없음" }), null);
});

test("profileRows: 빈 칸은 빼고, 합류 선수는 출전/득점 대신 합류", () => {
  const join = { season: "2026-27", post: post("a", "x", "2026-10-16") };
  assert.deepEqual(profileRows(player(), "아라", join), [["포지션", "아라 (ALA)"], ["합류", "2026-27 시즌"]]);
  assert.deepEqual(profileRows(player(), "아라", null), [["포지션", "아라 (ALA)"], ["출전", "0경기"], ["득점", "0골"]]);
  const full = player({ number: 7, birth: "2000-01-02", heightCm: 178, stats: { apps: 12, goals: 3, assists: 2 } });
  assert.deepEqual(profileRows(full, "아라", join), [
    ["등번호", "7"], ["포지션", "아라 (ALA)"], ["생년월일", "2000-01-02"], ["신장", "178cm"], ["출전", "12경기"], ["득점", "3골"], ["도움", "2개"],
  ]);
  // 등번호 0번도 보인다
  assert.deepEqual(profileRows(player({ number: 0, stats: { apps: 1, goals: 0, assists: 0 } }), "아라", null)[0], ["등번호", "0"]);
});

test("playerDescription: 기록 / 합류 / 둘 다 없음", () => {
  const base = { positionLabel: "아라", clubName: "서울은평 덴포스", statsSeason: STATS };
  const join = { season: "2026-27", post: post("a", "x", "2026-10-16") };
  assert.equal(playerDescription({ ...base, player: player(), join }), "강민원 (아라) - 서울은평 덴포스 선수. 2026-27 시즌 합류");
  assert.equal(playerDescription({ ...base, player: player(), join: null }), "강민원 (아라) - 서울은평 덴포스 선수.");
  assert.equal(
    playerDescription({ ...base, player: player({ stats: { apps: 12, goals: 3, assists: 0 } }), join }),
    "강민원 (아라) - 서울은평 덴포스 선수. 2025-26 시즌 12경기 3골",
  );
});

// ── 관련 소식 (D-068) ─────────────────────
const withBody = (p: NewsPost, body: string[], summary = ""): NewsPost => ({ ...p, body, summary });

test("mentionsName: 이름이 낱말로 있을 때만 (조사 허용, 앞뒤에 다른 한글이 붙으면 아님)", () => {
  assert.ok(mentionsName("서울은평 덴포스, '거침없는 질주' 강민원 영입", "강민원"));
  assert.ok(mentionsName("강민원의 결승골", "강민원"));
  assert.ok(mentionsName("강민원, 국가대표 발탁", "강민원"));
  assert.ok(!mentionsName("이상호텔 후원 협약", "이상호"));
  assert.ok(!mentionsName("김강민원 선수", "강민원"));
  assert.ok(!mentionsName("", "강민원"));
});

test("linksToPlayer: 선수 페이지 주소가 있을 때만 (뒤에 다른 슬러그 글자가 이어지면 아님)", () => {
  assert.ok(linksToPlayer("김종호 프로필\nhttps://eunpyeong-fs.com/team/players/kim-jongho", "kim-jongho"));
  assert.ok(linksToPlayer("/team/players/kim-jongho?from=news", "kim-jongho"));
  assert.ok(!linksToPlayer("https://eunpyeong-fs.com/team/players/kim-jongho-2", "kim-jongho"));
  assert.ok(!linksToPlayer("https://eunpyeong-fs.com/team/players", "kim-jongho"));
});

test("findPlayerNews: 구단뉴스와 공지사항 중 그 선수 글만, 최근 글 먼저 순서 그대로", () => {
  const posts = [
    post("a", "서울은평 덴포스, '거침없는 질주' 강민원 영입", "2026-10-16"),
    post("b", "서울은평 덴포스, 골레이로 임우성 영입", "2026-10-16"),
    withBody(post("c", "개막전 안내", "2026-11-10", "notice"), [], "강민원 사인회 안내"),
    post("d", "강민원 득점 장면", "2026-11-15", "video"),
    post("e", "강민원 사진", "2026-11-15", "photo"),
  ];
  const ids = findPlayerNews({ name: "강민원", slug: "kang-minwon", sameNameCount: 1, posts }).map((p) => p.id);
  assert.deepEqual(ids, ["a", "c"]);
  assert.deepEqual(findPlayerNews({ name: "강민원", slug: "kang-minwon", sameNameCount: 1, posts: [] }), []);
});

test("findPlayerNews: 동명이인(BR-025)은 선수 페이지 주소가 있는 글만 — 이름만으로는 넣지 않는다", () => {
  const welcome = withBody(post("w", "서울은평 덴포스, '확실한 존재감' 김종호 영입", "2026-10-19"), [
    "서울은평 덴포스가 김종호를 영입했다.",
    "김종호 프로필\n등번호: 30\nhttps://eunpyeong-fs.com/team/players/kim-jongho",
  ]);
  const other = post("o", "김종호, 국가대표 발탁", "2026-10-01");
  const posts = [welcome, other];
  assert.deepEqual(findPlayerNews({ name: "김종호", slug: "kim-jongho", sameNameCount: 2, posts }).map((p) => p.id), ["w"]);
  assert.deepEqual(findPlayerNews({ name: "김종호", slug: "no-22", sameNameCount: 2, posts }), []);
});
