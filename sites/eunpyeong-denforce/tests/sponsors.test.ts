// 스폰서 도우미(메인 띠, /sponsors 격자/문의 상자) 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { LEAGUE } from "../src/config/league.ts";
import { MARQUEE_MIN_ITEMS, MARQUEE_SECONDS_PER_ITEM, SPONSOR_GRID_COLUMNS, leagueEntryLine, marqueeLoop, wideColumns } from "../src/lib/sponsors.ts";
import type { SponsorTier } from "../src/types/index.ts";

test("marqueeLoop: 빈 목록이면 칸 없음", () => {
  assert.deepEqual(marqueeLoop([]), { cells: [], seconds: 0 });
});

test("marqueeLoop: 절반을 최소 칸 수까지 되풀이하고 같은 절반을 한 번 더 붙인다", () => {
  const { cells, seconds } = marqueeLoop(["a", "b", "c", "d", "e"], 12);
  // 5곳 → 한 바퀴 15칸(3회 반복), 전체 30칸
  assert.equal(cells.length, 30);
  const items = cells.map((c) => c.item);
  assert.deepEqual(items.slice(0, 15), items.slice(15));
  assert.deepEqual(items.slice(0, 6), ["a", "b", "c", "d", "e", "a"]);
  assert.equal(seconds, 15 * MARQUEE_SECONDS_PER_ITEM);
});

test("marqueeLoop: 맨 앞 한 벌만 실제 목록, 나머지는 복제 / key 는 겹치지 않음", () => {
  const { cells } = marqueeLoop(["a", "b", "c", "d", "e", "f"], 12);
  assert.deepEqual(cells.filter((c) => !c.clone).map((c) => c.item), ["a", "b", "c", "d", "e", "f"]);
  assert.equal(cells.length, 24);
  assert.equal(new Set(cells.map((c) => c.key)).size, cells.length);
});

test("marqueeLoop: 기본 최소 칸 수로 한 바퀴가 4K 화면(3840px)을 가장 좁은 칸(144px)으로도 덮는다", () => {
  const half = marqueeLoop(["a", "b", "c", "d", "e", "f"]).cells.length / 2;
  assert.ok(half >= MARQUEE_MIN_ITEMS);
  assert.ok(MARQUEE_MIN_ITEMS * 144 >= 3840);
});

test("marqueeLoop: 최소 칸 수보다 많으면 되풀이 없이 두 벌", () => {
  const list = Array.from({ length: 14 }, (_, i) => i);
  assert.equal(marqueeLoop(list, 12).cells.length, 28);
});

// 소유자가 정한 순서 (D-029): 은평구, 은평구체육회, 은평풋살연맹, 덴포스스포츠(네이밍), 풋살사관학교, 꽁병지TV
const OWNER_ORDER: SponsorTier[] = ["partner", "partner", "partner", "naming", "partner", "partner"];

test("wideColumns: 지금 순서면 네이밍 스폰서는 3칸/5칸 격자에서 두 칸, 2칸/4칸은 줄 끝 자리라 한 칸", () => {
  assert.deepEqual(wideColumns(OWNER_ORDER), [[], [], [], [3, 5], [], []]);
});

test("wideColumns: 넓혀도 어느 칸 수에서나 줄 중간에 빈칸이 생기지 않는다 (순서는 그대로)", () => {
  const orders: SponsorTier[][] = [
    OWNER_ORDER,
    ["naming", "partner", "partner", "partner", "partner", "partner"],
    ["partner", "naming", "naming", "partner", "official"],
    ["naming", "naming", "naming"],
  ];
  for (const tiers of orders) {
    const wide = wideColumns(tiers);
    for (const columns of SPONSOR_GRID_COLUMNS) {
      // 줄 안 자리를 따라가며 두 칸짜리가 줄 끝을 넘지 않는지 (넘으면 브라우저가 다음 줄로 보내 빈칸이 생긴다)
      let at = 0;
      tiers.forEach((_, i) => {
        const span = wide[i].includes(columns) ? 2 : 1;
        assert.ok(at + span <= columns, `${tiers.join(",")} / ${columns}칸: ${i}번이 줄을 넘음`);
        at = (at + span) % columns;
      });
    }
  }
});

test("wideColumns: 네이밍이 아니면 넓히지 않고, 1칸 격자에서는 아무것도 넓히지 않는다", () => {
  assert.deepEqual(wideColumns(["partner", "official", "partner"]), [[], [], []]);
  assert.deepEqual(wideColumns(["naming", "partner"], [1]), [[], []]);
  assert.deepEqual(wideColumns([]), []);
  assert.deepEqual(wideColumns(["naming", "partner"]), [[2, 3, 4, 5], []]);
});

test("leagueEntryLine: 지금 시즌 대회명 → 리그 참가 한 줄", () => {
  assert.equal(leagueEntryLine("2026-27 FK1리그"), "2026-27 시즌 FK리그 1부(FK1) 참가");
  assert.equal(leagueEntryLine("2027-28 FK2리그"), "2027-28 시즌 FK리그 2부(FK2) 참가");
  // 지금 시즌 설정(config/league.ts)이 이 형식이어야 스폰서 페이지에 줄이 보인다
  assert.ok(leagueEntryLine(LEAGUE.currentCompetition));
});

test("leagueEntryLine: 시즌 연도나 부가 없는 대회명은 null (줄을 숨긴다)", () => {
  assert.equal(leagueEntryLine("2026 FK CUP"), null);
  assert.equal(leagueEntryLine("2025-26 승강 플레이오프"), null);
  assert.equal(leagueEntryLine(""), null);
});
