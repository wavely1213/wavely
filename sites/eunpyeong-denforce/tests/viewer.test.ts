// 사진 크게 보기 계산 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { stepIndex, swipeStep, SWIPE_MIN_PX } from "../src/lib/viewer.ts";

test("stepIndex: 이전/다음, 끝에서 다음은 처음 / 처음에서 이전은 끝", () => {
  assert.equal(stepIndex(0, 1, 9), 1);
  assert.equal(stepIndex(8, 1, 9), 0);
  assert.equal(stepIndex(0, -1, 9), 8);
  assert.equal(stepIndex(4, -1, 9), 3);
  assert.equal(stepIndex(0, 1, 1), 0, "한 장이면 그대로");
  assert.equal(stepIndex(0, 1, 0), 0, "사진이 없어도 깨지지 않는다");
});

test("swipeStep: 왼쪽으로 밀면 다음, 오른쪽은 이전, 짧거나 세로로 민 것은 무시", () => {
  assert.equal(swipeStep(-80, 10), 1);
  assert.equal(swipeStep(80, -10), -1);
  assert.equal(swipeStep(-(SWIPE_MIN_PX - 1), 0), 0, "기준보다 짧다");
  assert.equal(swipeStep(-60, 120), 0, "위아래로 더 많이 밀었다(스크롤)");
  assert.equal(swipeStep(0, 0), 0, "누르기만 했다");
});
