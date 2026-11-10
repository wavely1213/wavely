// 경기 목록 묶기·라벨 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatKickoffFull } from "../src/lib/format.ts";
import { crestInitial, crestInitialShort, teamNameSegments, groupByCompetition, hasMatchDetails, homeMatchItems, matchLabel, matchVideoLinks, scheduleEmptyLinks } from "../src/lib/match.ts";
import type { Match } from "../src/types/index.ts";

const m = (id: string, competition: string, round = ""): Match => ({
  id, competition, round, kickoff: "2026-01-01T00:00:00+09:00", venue: "", isHome: true, opponent: "A", status: "finished", score: { us: 1, them: 0 },
  highlightUrl: null, replayUrl: null, scorers: null,
});

test("groupByCompetition: 연속된 같은 대회끼리 묶고 순서 유지", () => {
  const g = groupByCompetition([m("1", "CUP"), m("2", "FK1"), m("3", "FK1"), m("4", "CUP")]);
  assert.deepEqual(g.map((x) => [x.competition, x.matches.map((y) => y.id)]), [["CUP", ["1"]], ["FK1", ["2", "3"]], ["CUP", ["4"]]]);
  assert.deepEqual(groupByCompetition([]), []);
});

test("matchLabel: 라운드가 없으면 구분점 없이 대회명만", () => {
  assert.equal(matchLabel(m("1", "2025-26 FK1리그", "1R")), "2025-26 FK1리그 / 1R");
  assert.equal(matchLabel(m("1", "2026 FK CUP")), "2026 FK CUP");
});

test("formatKickoffFull: 연맹 표기 YYYY-MM-DD (요일) + HH:MM, 한국 시간 기준", () => {
  assert.deepEqual(formatKickoffFull("2025-11-15T15:00:00+09:00"), { date: "2025-11-15 (토)", time: "15:00" });
  // UTC 로 저장된 값도 한국 날짜로 (UTC 2026-08-24 23:30 = KST 08-25 08:30)
  assert.deepEqual(formatKickoffFull("2026-08-24T23:30:00Z"), { date: "2026-08-25 (화)", time: "08:30" });
});

test("homeMatchItems: 지난 1 + 다음 + 그다음 (3칸) / 지난 경기 없어도 예정은 최대 2(그다음 경기 한 번) / 예정 없으면 최근 결과 3", () => {
  const f = [{ id: "f1" }, { id: "f2" }, { id: "f3" }, { id: "f4" }] as Match[];
  const u = [{ id: "u1" }, { id: "u2" }, { id: "u3" }] as Match[];
  const ids = (xs: Array<{ match: Match; label: string }>) => xs.map((x) => `${x.match.id}:${x.label}`);
  assert.deepEqual(ids(homeMatchItems(f, u)), ["f1:지난 경기", "u1:다음 경기", "u2:그다음 경기"]);
  assert.deepEqual(ids(homeMatchItems([], u)), ["u1:다음 경기", "u2:그다음 경기"]);
  assert.deepEqual(ids(homeMatchItems(f, [])), ["f1:지난 경기", "f2:지난 경기", "f3:지난 경기"]);
  assert.deepEqual(ids(homeMatchItems(f, u.slice(0, 1))), ["f1:지난 경기", "u1:다음 경기"]);
  assert.deepEqual(homeMatchItems([], []), []);
});

test("crestInitial: 팀 이름 앞 2글자", () => {
  assert.equal(crestInitial("고양불스풋살클럽"), "고양");
  assert.equal(crestInitial(" 인천ZD스포츠"), "인천");
  assert.equal(crestInitial("A"), "A");
});

test("hasMatchDetails: 종료 경기이고 득점자나 영상이 있을 때만", () => {
  assert.equal(hasMatchDetails(m("1", "A")), false);
  assert.equal(hasMatchDetails({ ...m("1", "A"), scorers: "원해연 2, 김민성" }), true);
  assert.equal(hasMatchDetails({ ...m("1", "A"), replayUrl: "https://youtu.be/r" }), true);
  assert.equal(hasMatchDetails({ ...m("1", "A"), replayUrl: "http://a.kr/v" }), false);
  // 예정 경기는 주소가 있어도 결과 줄을 만들지 않는다
  assert.equal(hasMatchDetails({ ...m("1", "A"), status: "scheduled", score: null, highlightUrl: "https://youtu.be/h" }), false);
});

test("matchVideoLinks: 하이라이트 → 다시보기 순, 주소 있는 것만, 화면 읽기 이름은 버튼 글자 + 경기 (홈팀 먼저)", () => {
  const base = { ...m("1", "2025-26 FK1리그", "1R"), kickoff: "2025-11-15T15:00:00+09:00", opponent: "강원FS" };
  assert.deepEqual(matchVideoLinks(base, "서울은평 덴포스"), []);
  const both = matchVideoLinks({ ...base, highlightUrl: "https://youtu.be/h", replayUrl: "https://youtu.be/r" }, "서울은평 덴포스");
  assert.deepEqual(both.map((v) => [v.kind, v.label, v.url]), [
    ["highlight", "하이라이트", "https://youtu.be/h"],
    ["replay", "다시보기", "https://youtu.be/r"],
  ]);
  assert.equal(both[0].ariaLabel, "하이라이트 영상 - 2025-11-15 (토) 서울은평 덴포스 vs 강원FS (새 창)");
  // 원정 경기는 상대가 먼저 (BR-002)
  const away = matchVideoLinks({ ...base, isHome: false, replayUrl: "https://youtu.be/r" }, "서울은평 덴포스");
  assert.deepEqual(away.map((v) => v.kind), ["replay"]);
  assert.equal(away[0].ariaLabel, "다시보기 영상 - 2025-11-15 (토) 강원FS vs 서울은평 덴포스 (새 창)");
  // 화면 글에는 중간점을 쓰지 않는다 (BR-024)
  assert.ok(both.every((v) => !v.ariaLabel.includes("·")));
  // https 가 아닌 주소는 버튼을 만들지 않는다
  assert.deepEqual(matchVideoLinks({ ...base, highlightUrl: "javascript:alert(1)", replayUrl: "http://a.kr/v" }, "서울은평 덴포스"), []);
});

test("scheduleEmptyLinks: 리그순위 / 지난 경기 결과 / 인스타그램(주소가 있을 때만, 새 창)", () => {
  assert.deepEqual(scheduleEmptyLinks("https://www.instagram.com/eunpyeong_denforce"), [
    { label: "리그순위", href: "/match/standings", external: false },
    { label: "지난 경기 결과", href: "/match/results", external: false },
    { label: "일정 발표 소식 받기", href: "https://www.instagram.com/eunpyeong_denforce", external: true },
  ]);
  assert.deepEqual(scheduleEmptyLinks(null).map((l) => l.label), ["리그순위", "지난 경기 결과"]);
});

test("teamNameSegments: 띄어쓰기 없는 긴 이름은 뒷말 앞에서 나눔, 띄어쓰기 있거나 짧으면 그대로", () => {
  assert.deepEqual(teamNameSegments("고양불스풋살클럽"), ["고양불스", "풋살클럽"]);
  assert.deepEqual(teamNameSegments("전주시민풋살구단"), ["전주시민", "풋살구단"]);
  assert.deepEqual(teamNameSegments("인천ZD스포츠"), ["인천ZD", "스포츠"]);
  assert.deepEqual(teamNameSegments("용인지솔FS"), ["용인지솔", "FS"]);
  assert.deepEqual(teamNameSegments("서울은평 덴포스"), ["서울은평 덴포스"]);
  assert.deepEqual(teamNameSegments("강원FS"), ["강원", "FS"]);
  assert.deepEqual(teamNameSegments("FS"), ["FS"]);
});

test("crestInitialShort: 표(24) 대체 방패는 한 글자, 영문이면 대문자", () => {
  assert.equal(crestInitialShort("경기LBFS"), "경");
  assert.equal(crestInitialShort("LBFS"), "L");
  assert.equal(crestInitialShort(" lbfs"), "L");
  assert.equal(crestInitialShort("인천ZD스포츠"), "인");
  assert.equal(crestInitialShort(""), "");
});
