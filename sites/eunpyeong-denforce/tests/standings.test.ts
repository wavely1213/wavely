// 리그순위 정렬·시즌 묶기 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { byRank, pastLeagues, seasonSlug, seasonYear } from "../src/lib/standings.ts";
import type { StandingRow } from "../src/types/index.ts";

const row = (season: string, team: string, w = 0, d = 0, l = 0, gf = 0, ga = 0, isUs = false): StandingRow => ({
  id: `${season}:${team}`,
  season,
  team,
  played: w + d + l,
  win: w,
  draw: d,
  loss: l,
  goalsFor: gf,
  goalsAgainst: ga,
  points: w * 3 + d,
  isUs,
});

test("byRank: 승점 → 득실차 → 다득점 (BR-001)", () => {
  const a = row("s", "A", 2, 0, 0, 3, 1); // 6점 +2
  const b = row("s", "B", 2, 0, 0, 5, 1); // 6점 +4
  const c = row("s", "C", 1, 3, 0, 9, 1); // 6점 +8
  const d = row("s", "D", 1, 0, 0, 1, 0); // 3점
  assert.deepEqual([d, a, b, c].sort(byRank).map((r) => r.team), ["C", "B", "A", "D"]);
  const e = row("s", "E", 1, 0, 1, 4, 4); // 3점 0, 4득점
  const f = row("s", "F", 1, 0, 1, 2, 2); // 3점 0, 2득점
  assert.deepEqual([f, e].sort(byRank).map((r) => r.team), ["E", "F"]);
});

test("byRank: 모두 같으면(개막 전 0점) 팀명 가나다순", () => {
  const teams = ["제천풋살클럽", "구미FS", "서울은평 덴포스", "대구FS", "인천남동풋살클럽"];
  const sorted = teams.map((t) => row("s", t)).sort(byRank).map((r) => r.team);
  assert.deepEqual(sorted, ["구미FS", "대구FS", "서울은평 덴포스", "인천남동풋살클럽", "제천풋살클럽"]);
});

test("seasonSlug: 주소용 이름", () => {
  assert.equal(seasonSlug("2025-26 FK1리그"), "2025-26-fk1");
  assert.equal(seasonSlug("2026-27 FK2리그"), "2026-27-fk2");
  assert.equal(seasonSlug("2017-18 드림리그"), encodeURIComponent("2017-18 드림리그"));
});

test("seasonYear: 시즌 연도 범위만 (연도 하나짜리 컵대회는 null)", () => {
  assert.equal(seasonYear("2025-26 FK1리그"), "2025-26");
  assert.equal(seasonYear("2025-26 승강 플레이오프"), "2025-26");
  assert.equal(seasonYear("2026 FK CUP"), null);
  assert.equal(seasonYear("FK리그 2026-27"), null);
});

test("pastLeagues: 지금 시즌 제외, 최근 시즌 먼저, 우리 팀 최종 성적 (BR-016)", () => {
  const rows = [
    row("2026-27 FK2리그", "서울은평 덴포스", 0, 0, 0, 0, 0, true),
    row("2024-25 FK1리그", "X", 9, 0, 0, 30, 5),
    row("2024-25 FK1리그", "서울은평 덴포스", 5, 2, 2, 20, 15, true),
    row("2025-26 FK1리그", "서울은평 덴포스", 2, 3, 10, 34, 89, true),
    row("2025-26 FK1리그", "경기LBFS", 10, 2, 3, 83, 24),
    row("2025-26 FK1리그", "노원제너FS", 10, 2, 3, 60, 34),
  ];
  const past = pastLeagues(rows, "2026-27 FK2리그");
  assert.deepEqual(past.map((p) => p.season), ["2025-26 FK1리그", "2024-25 FK1리그"]);
  assert.deepEqual(past[0].rows.map((r) => r.team), ["경기LBFS", "노원제너FS", "서울은평 덴포스"]);
  assert.deepEqual(past[0].us, { rank: 3, win: 2, draw: 3, loss: 10 });
  assert.equal(past[0].slug, "2025-26-fk1");
  assert.deepEqual(past[1].us, { rank: 2, win: 5, draw: 2, loss: 2 });
  assert.deepEqual(pastLeagues([row("2025-26 FK1리그", "X")], "2026-27 FK2리그")[0].us, null);
});
