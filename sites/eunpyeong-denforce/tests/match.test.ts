// 경기 목록 묶기·라벨 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatKickoffFull } from "../src/lib/format.ts";
import { groupByCompetition, homeMatchItems, matchLabel } from "../src/lib/match.ts";
import type { Match } from "../src/types/index.ts";

const m = (id: string, competition: string, round = ""): Match => ({
  id, competition, round, kickoff: "2026-01-01T00:00:00+09:00", venue: "", isHome: true, opponent: "A", status: "finished", score: { us: 1, them: 0 },
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

test("homeMatchItems: 지난 1 + 다음 1 / 지난 경기 없으면 예정 2 / 예정 없으면 최근 결과 2", () => {
  const f = [m("f1", "A"), m("f2", "A"), m("f3", "A")];
  const u = [m("u1", "A"), m("u2", "A")];
  const ids = (xs: Array<{ match: Match; label: string }>) => xs.map((x) => `${x.match.id}:${x.label}`);
  assert.deepEqual(ids(homeMatchItems(f, u)), ["f1:지난 경기", "u1:다음 경기"]);
  assert.deepEqual(ids(homeMatchItems([], u)), ["u1:다음 경기", "u2:예정"]);
  assert.deepEqual(ids(homeMatchItems(f, [])), ["f1:지난 경기", "f2:지난 경기"]);
  assert.deepEqual(homeMatchItems([], []), []);
  assert.deepEqual(ids(homeMatchItems(f, u, 3)), ["f1:지난 경기", "u1:다음 경기", "u2:예정"]);
});
