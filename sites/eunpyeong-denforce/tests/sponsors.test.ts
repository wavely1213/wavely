// 스폰서 띠 도우미 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { MARQUEE_SECONDS_PER_ITEM, marqueeLoop } from "../src/lib/sponsors.ts";

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

test("marqueeLoop: 최소 칸 수보다 많으면 되풀이 없이 두 벌", () => {
  const list = Array.from({ length: 14 }, (_, i) => i);
  assert.equal(marqueeLoop(list, 12).cells.length, 28);
});
