// SwipeRow 점 개수/넘김 거리 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { swipeMetrics } from "../src/lib/swipe.ts";

const base = { pad: 8, gap: 16, scrolls: true };

test("swipeMetrics: 휴대폰 1칸 보임 — 칸마다 점(선수 11명이면 11개), 한 칸씩", () => {
  // 보이는 폭 358, 칸 334(100% - 24) + 사이 16 = 350
  assert.deepEqual(swipeMetrics({ ...base, clientWidth: 366, itemStep: 350, items: 11 }), { step: 350, count: 11 });
});

test("swipeMetrics: PC 4칸 보임 — 페이지 단위 올림(11명이면 3페이지)", () => {
  // 보이는 폭 1160, 칸 (1160 - 24*3)/4 = 272 + 24 = 296
  assert.deepEqual(swipeMetrics({ ...base, pad: 8, gap: 24, clientWidth: 1168, itemStep: 296, items: 11 }), { step: 1184, count: 3 });
});

test("swipeMetrics: 다 보이거나, 넘기지 않는 줄이거나, 칸이 하나면 점 없음", () => {
  assert.equal(swipeMetrics({ ...base, gap: 24, clientWidth: 1168, itemStep: 296, items: 4 }).count, 1);
  assert.equal(swipeMetrics({ ...base, clientWidth: 400, itemStep: 350, items: 3, scrolls: false }).count, 1);
  assert.equal(swipeMetrics({ ...base, clientWidth: 400, itemStep: 350, items: 1 }).count, 1);
});

test("swipeMetrics: 태블릿 경기 띠 2칸 보임, 3칸이면 2페이지", () => {
  assert.deepEqual(swipeMetrics({ pad: 8, gap: 0, scrolls: true, clientWidth: 688, itemStep: 340, items: 3 }), { step: 680, count: 2 });
});
