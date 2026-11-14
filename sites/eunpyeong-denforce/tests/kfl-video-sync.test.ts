import assert from "node:assert/strict";
import { test } from "node:test";
import {
  normalizeTeam,
  opponentOf,
  parseFeed,
  parseTitle,
  planVideos,
  sameOpponent,
  seoulDate,
  type FeedEntry,
  type MatchLite,
} from "../supabase/functions/kfl-video-sync/plan.ts";

// 연맹 유튜브 경기 영상 자동 연결 (D-090) — 제목 파싱, 짝짓기 (supabase/data/2026-10-18_match_videos.sql 손작업 규칙)

test("제목 파싱 표", () => {
  const rows: Array<[string, ReturnType<typeof parseTitle>]> = [
    ["[FK1] 노원제너FS VS 서울은평덴포스 (2026.11.15.) - 1R", { kind: "replay", teams: ["노원제너FS", "서울은평덴포스"], date: "2026-11-15" }],
    ["[LIVE] 서울은평 덴포스 vs 강원FS (2025/11/15)  1라운드", { kind: "replay", teams: ["서울은평 덴포스", "강원FS"], date: "2025-11-15" }],
    ["[다시보기] 2025/12/28 고양불스풋살클럽vs서울은평 덴포스", { kind: "replay", teams: ["고양불스풋살클럽", "서울은평 덴포스"], date: "2025-12-28" }],
    ["[하이라이트] 서울은평 덴포스 vs 전주시민풋살클럽 (2025/12/14) 5라운드", { kind: "highlight", teams: ["서울은평 덴포스", "전주시민풋살클럽"], date: "2025-12-14" }],
    ["[FK2] 제천풋살클럽 VS 인천ZD스포츠 경기 하이라이트 (2026.11.14)", { kind: "highlight", teams: ["제천풋살클럽", "인천ZD스포츠"], date: "2026-11-14" }],
    ["[FK1] 서울은평덴포스 VS 용인지솔FS - 2R", { kind: "replay", teams: ["서울은평덴포스", "용인지솔FS"], date: null }],
    ["[인터뷰] 서울은평 덴포스 vs 전주시민풋살구단 15R 2026/03/28 - 김영록", null],
    ["새로운 시즌의 시작, 첫 골을 장식한 주인공은?", null],
    ["키움증권 2026-27 FK 리그 미디어데이", null],
  ];
  for (const [title, want] of rows) assert.deepEqual(parseTitle(title), want, title);
});

test("상대 팀 고르기, 이름 비교(띄어쓰기 무시, 별칭)", () => {
  assert.equal(opponentOf(["노원제너FS", "서울은평덴포스"]), "노원제너FS");
  assert.equal(opponentOf(["서울은평 덴포스", "강원FS"]), "강원FS");
  assert.equal(opponentOf(["제천풋살클럽", "인천ZD스포츠"]), null);
  assert.equal(normalizeTeam("고양불스 풋살클럽"), "고양불스풋살클럽");
  assert.ok(sameOpponent("전주시민풋살클럽", "전주시민풋살구단"));
  assert.ok(sameOpponent("강원fs", "강원FS"));
  assert.ok(!sameOpponent("강원FS", "화성FS"));
});

test("서울 날짜 (UTC 밤 경기는 다음 날)", () => {
  assert.equal(seoulDate("2026-11-15T05:00:00Z"), "2026-11-15");
  assert.equal(seoulDate("2026-11-14T16:00:00Z"), "2026-11-15");
});

const M = (id: string, date: string, opponent: string, over: Partial<MatchLite> = {}): MatchLite => ({
  id,
  date,
  opponent,
  highlight_url: null,
  replay_url: null,
  ...over,
});
const E = (videoId: string, title: string): FeedEntry => ({ videoId, title, published: "2026-11-11T07:43:46+00:00" });

test("짝짓기 표: 지난 시즌 손작업과 같은 결과 (날짜 + 상대, 별칭)", () => {
  const matches = [M("m1", "2025-11-15", "강원FS"), M("m5", "2025-12-14", "전주시민풋살구단"), M("m6", "2025-12-28", "고양불스풋살클럽")];
  const plan = planVideos(
    [
      E("ZcRT9Wob-TQ", "[LIVE] 서울은평 덴포스 vs 강원FS (2025/11/15)  1라운드"),
      E("TYf4ZnmFpQM", "[하이라이트] 서울은평 덴포스 vs 강원FS (2025/11/15) 1라운드"),
      E("1O-2DyDIMr8", "[LIVE] 전주시민풋살클럽 vs 서울은평 덴포스 (2025/12/14) 5라운드"),
      E("lbpS8HPavU8", "[LIVE] 고양불스풋살클럽 vs 서울은평 덴포스 (2025/12/28) 3라운드"),
      E("Df_ofScDaRs", "[인터뷰] 서울은평 덴포스 vs 전주시민풋살구단 15R 2026/03/28 - 김영록"),
      E("aaaaaaaaaaa", "[FK2] 제천풋살클럽 VS 인천ZD스포츠 (2026.11.14.) - 1R"),
    ],
    matches,
  );
  assert.deepEqual(
    plan.updates.map((u) => [u.matchId, u.field, u.videoId]),
    [
      ["m1", "replay_url", "ZcRT9Wob-TQ"],
      ["m1", "highlight_url", "TYf4ZnmFpQM"],
      ["m5", "replay_url", "1O-2DyDIMr8"],
      ["m6", "replay_url", "lbpS8HPavU8"],
    ],
  );
  assert.equal(plan.updates[0].url, "https://www.youtube.com/watch?v=ZcRT9Wob-TQ");
  assert.ok(plan.notes.some((n) => n.includes("Df_ofScDaRs") && n.includes("경기 영상 아님")));
  // 남의 경기(은평/덴포스 없음)는 기록도 하지 않는다
  assert.ok(!plan.notes.some((n) => n.includes("aaaaaaaaaaa")));
});

test("이미 값이 있으면 덮지 않는다 (1R 은 총괄이 넣음)", () => {
  const plan = planVideos([E("NEWVIDEO001", "[FK1] 노원제너FS VS 서울은평덴포스 (2026.11.15.) - 1R")], [
    M("r1", "2026-11-15", "노원제너FS", { replay_url: "https://www.youtube.com/watch?v=OLDVIDEO001" }),
  ]);
  assert.deepEqual(plan.updates, []);
});

test("날짜 없으면 게시일로 추정하지 않고 기록, 맞는 경기 없음/후보 둘 이상도 기록", () => {
  const matches = [M("r2", "2026-11-21", "용인지솔FS")];
  const plan = planVideos(
    [
      E("NODATE00001", "[FK1] 서울은평덴포스 VS 용인지솔FS - 2R"),
      E("NOMATCH0001", "[FK1] 서울은평덴포스 VS 강원FS (2026.11.21.) - 2R"),
      E("DUPLIVE0001", "[FK1] 용인지솔FS VS 서울은평덴포스 (2026.11.21.) - 2R"),
      E("DUPLIVE0002", "[LIVE] 용인지솔FS vs 서울은평 덴포스 (2026/11/21) 2라운드"),
    ],
    matches,
  );
  assert.deepEqual(plan.updates, []);
  assert.ok(plan.notes.some((n) => n.startsWith("날짜 없음") && n.includes("NODATE00001")));
  assert.ok(plan.notes.some((n) => n.startsWith("맞는 경기 없음") && n.includes("NOMATCH0001")));
  assert.ok(plan.notes.some((n) => n.startsWith("후보 2개라 넣지 않음") && n.includes("DUPLIVE0001") && n.includes("DUPLIVE0002")));
});

test("같은 날 같은 상대 경기가 둘이면(데이터 오류) 넣지 않는다", () => {
  const plan = planVideos([E("TWOMATCH001", "[FK1] 서울은평덴포스 VS 강원FS (2026.12.12.) - 5R")], [M("a", "2026-12-12", "강원FS"), M("b", "2026-12-12", "강원FS")]);
  assert.deepEqual(plan.updates, []);
  assert.ok(plan.notes[0].startsWith("맞는 경기가 둘 이상"));
});

test("RSS 읽기: 영상 ID, 제목(글자 참조 풀기), 게시일", () => {
  const xml = `<?xml version="1.0"?><feed><title>한국풋살연맹 - KFL</title>
<entry><id>yt:video:Abc_def-123</id><yt:videoId>Abc_def-123</yt:videoId><title>[FK1] 노원제너FS VS 서울은평덴포스 (2026.11.15.) - 1R</title><published>2026-11-11T07:43:46+00:00</published></entry>
<entry><yt:videoId>Xyz_def-456</yt:videoId><title>백호 &amp; 프렌즈</title><published>2026-10-01T05:09:21+00:00</published></entry>
<entry><yt:videoId>bad</yt:videoId><title>x</title></entry></feed>`;
  assert.deepEqual(parseFeed(xml), [
    { videoId: "Abc_def-123", title: "[FK1] 노원제너FS VS 서울은평덴포스 (2026.11.15.) - 1R", published: "2026-11-11T07:43:46+00:00" },
    { videoId: "Xyz_def-456", title: "백호 & 프렌즈", published: "2026-10-01T05:09:21+00:00" },
  ]);
});

// ── D-090 검토 반영 ──

test("라운드가 팀 앞에 오는 FK CUP 제목('… 3라운드 | A vs B')", () => {
  assert.deepEqual(parseTitle("[2026.08.25] 단양군과 함께하는 2026 FK CUP 남자부 3라운드 | 서울은평덴포스 vs 인천ZD스포츠"), {
    kind: "replay",
    teams: ["서울은평덴포스", "인천ZD스포츠"],
    date: "2026-08-25",
  });
});

test("날짜 뒤 단계 글자는 상대 이름이 아니다 (승강 플레이오프, 승강PO, - 8강, - 결승)", () => {
  assert.deepEqual(parseTitle("[LIVE] 서울은평덴포스FS vs 화성FS (2026/04/04) 승강 플레이오프"), {
    kind: "replay",
    teams: ["서울은평덴포스FS", "화성FS"],
    date: "2026-04-04",
  });
  for (const tail of ["승강PO", "- 8강", "- 결승", "준결승"]) {
    assert.deepEqual(parseTitle(`[LIVE] 서울은평 덴포스 vs 강원FS (2026/03/01) ${tail}`)?.teams, ["서울은평 덴포스", "강원FS"], tail);
  }
  // 수동 파일(2026-10-18_match_videos.sql)의 짝: 2026-04-04 승강 PO 화성FS → replay jSRqL1-wI1k
  const plan = planVideos([E("jSRqL1-wI1k", "[LIVE] 서울은평덴포스FS vs 화성FS (2026/04/04) 승강 플레이오프")], [M("6d7d7de0", "2026-04-04", "화성FS")]);
  assert.deepEqual(plan.updates.map((u) => [u.matchId, u.field, u.videoId]), [["6d7d7de0", "replay_url", "jSRqL1-wI1k"]]);
  const cup = planVideos([E("CVy3g6RNsAA", "[2026.08.25] 단양군과 함께하는 2026 FK CUP 남자부 3라운드 | 서울은평덴포스 vs 인천ZD스포츠")], [M("a5991b61", "2026-08-25", "인천ZD스포츠")]);
  assert.deepEqual(cup.updates.map((u) => u.videoId), ["CVy3g6RNsAA"]);
});

test("한 번 넣었다가 관리자가 비운 칸은 다시 넣지 않고 기록", () => {
  const plan = planVideos([E("ZcRT9Wob-TQ", "[LIVE] 서울은평 덴포스 vs 강원FS (2025/11/15)  1라운드")], [M("m1", "2025-11-15", "강원FS")], new Set(["m1:replay_url"]));
  assert.deepEqual(plan.updates, []);
  assert.ok(plan.notes.some((n) => n.startsWith("관리자가 비운 칸")));
  // 다른 칸(하이라이트)은 그대로 넣는다
  const other = planVideos([E("TYf4ZnmFpQM", "[하이라이트] 서울은평 덴포스 vs 강원FS (2025/11/15)")], [M("m1", "2025-11-15", "강원FS")], new Set(["m1:replay_url"]));
  assert.equal(other.updates.length, 1);
});

test("별칭은 정규화한 이름끼리 (띄어쓰기 다른 표기도)", () => {
  assert.ok(sameOpponent("전주시민 풋살클럽", "전주시민풋살구단"));
  assert.ok(sameOpponent("전주시민풋살구단", "전주시민 풋살클럽"));
  assert.ok(!sameOpponent("전주시민풋살클럽", "강원FS"));
});

test("RSS: 범위 밖 숫자 참조는 그 항목만 버린다, &amp;amp; 는 &amp;", () => {
  const xml = `<feed>
<entry><yt:videoId>Bad_entry01</yt:videoId><title>깨짐 &#99999999;</title><published>2026-11-01T00:00:00+00:00</published></entry>
<entry><yt:videoId>Good_entry1</yt:videoId><title>A &amp;amp; B &#x41;</title><published>2026-11-02T00:00:00+00:00</published></entry>
</feed>`;
  assert.deepEqual(parseFeed(xml), [{ videoId: "Good_entry1", title: "A &amp; B A", published: "2026-11-02T00:00:00+00:00" }]);
});
