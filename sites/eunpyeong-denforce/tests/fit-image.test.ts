import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldFill } from "../src/lib/fit-image.ts";

test("shouldFill: 비율이 비슷하면 채움, 크게 다르면 전체 보기, 크기 모르면 전체 보기", () => {
  assert.equal(shouldFill(1600, 900, 400, 225), true); // 16:9 사진, 16:9 칸
  assert.equal(shouldFill(1080, 1350, 400, 225), false); // 4:5 포스터, 16:9 칸
  // 같은 포스터도 칸이 세로(휴대폰 세로)면 채우고, 가로로 돌리면 전체 보기 — 칸이 바뀌면 다시 판정해야 한다 (재검증 #6)
  assert.equal(shouldFill(1080, 1350, 358, 430), true);
  assert.equal(shouldFill(1080, 1350, 800, 360), false);
  assert.equal(shouldFill(0, 0, 400, 225), false);
  assert.equal(shouldFill(1080, 1350, 0, 0), false);
});
