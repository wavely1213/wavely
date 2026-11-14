// 가로 탭 줄(ScrollRow) 계산 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { edgeFades, revealScrollLeft } from "../src/lib/scroll-row.ts";

test("edgeFades: 가려진 탭이 있는 쪽만 흐리게 (소수점 스크롤은 끝에 닿은 것으로)", () => {
  assert.deepEqual(edgeFades(0, 500, 390), { start: false, end: true }, "처음: 오른쪽만");
  assert.deepEqual(edgeFades(50, 500, 390), { start: true, end: true }, "가운데: 양쪽");
  assert.deepEqual(edgeFades(109.6, 500, 390), { start: true, end: false }, "끝(소수점): 왼쪽만");
  assert.deepEqual(edgeFades(0, 390, 390), { start: false, end: false }, "넘치지 않으면 흐림 없음");
});

test("revealScrollLeft: 화면 밖 탭(휴대폰 '포스팅')은 가운데로, 줄 끝을 넘지 않게", () => {
  // 줄 폭 390, 내용 508 — 마지막 탭 444~492 는 처음 화면(0~390) 밖
  const row = { scrollLeft: 0, clientWidth: 390, scrollWidth: 508, margin: 32 };
  assert.equal(revealScrollLeft({ ...row, start: 444, end: 492 }), 118, "끝까지 밀어 보인다");
  // 오른쪽 흐림(358~390) 앞에서 끝나는 탭(250~314)은 그대로
  assert.equal(revealScrollLeft({ ...row, start: 250, end: 314 }), 0, "이미 다 보이면 그대로");
  // 오른쪽 흐림에 걸친 탭(340~390)은 가린 것으로 보고 가운데로 — 가운데(170)는 줄 끝(118)을 넘어 118
  assert.equal(revealScrollLeft({ ...row, start: 340, end: 390 }), 118, "흐림에 걸치면 옮긴다");
  // 내용이 긴 줄에서는 정확히 가운데로
  assert.equal(revealScrollLeft({ ...row, scrollWidth: 1000, start: 600, end: 660 }), 435, "가운데 = 600 - (390 - 60) / 2");
});

test("revealScrollLeft: 처음 탭으로 돌아가면 0, 넘치지 않는 줄은 늘 0", () => {
  assert.equal(revealScrollLeft({ start: 16, end: 48, scrollLeft: 118, clientWidth: 390, scrollWidth: 508, margin: 32 }), 0);
  assert.equal(revealScrollLeft({ start: 300, end: 350, scrollLeft: 0, clientWidth: 390, scrollWidth: 390, margin: 32 }), 0);
});
