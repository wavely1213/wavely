// 굵게 표시(**…**)·팀 색상 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { hexToRgb, inkOn } from "../src/lib/color.ts";
import { emphasisParts } from "../src/lib/emphasis.ts";

test("emphasisParts: **굵게** 조각과 보통 조각", () => {
  assert.deepEqual(emphasisParts("엠블럼은 **페넌트 형태**에 **'E'**를 담았습니다."), [
    { text: "엠블럼은 ", strong: false },
    { text: "페넌트 형태", strong: true },
    { text: "에 ", strong: false },
    { text: "'E'", strong: true },
    { text: "를 담았습니다.", strong: false },
  ]);
  assert.deepEqual(emphasisParts("**처음부터**"), [{ text: "처음부터", strong: true }]);
  assert.deepEqual(emphasisParts("표시 없음"), [{ text: "표시 없음", strong: false }]);
  assert.deepEqual(emphasisParts(""), []);
});

test("emphasisParts: 짝이 안 맞거나 빈 ** 는 글자 그대로", () => {
  assert.deepEqual(emphasisParts("별 **하나만"), [{ text: "별 **하나만", strong: false }]);
  assert.deepEqual(emphasisParts("빈 **** 표시"), [{ text: "빈 **** 표시", strong: false }]);
});

test("hexToRgb: #RRGGBB 만, 대소문자·앞뒤 공백 허용", () => {
  assert.deepEqual(hexToRgb("#2B4FA2"), [43, 79, 162]);
  assert.deepEqual(hexToRgb(" #ffffff "), [255, 255, 255]);
  for (const bad of ["2B4FA2", "#FFF", "#GGGGGG", ""]) assert.equal(hexToRgb(bad), null, bad);
});

test("inkOn: 어두운 색은 흰 글씨, 밝은 색은 어두운 글씨", () => {
  assert.equal(inkOn([43, 79, 162]), "light"); // 로열블루
  assert.equal(inkOn([26, 23, 21]), "light"); // 블랙
  assert.equal(inkOn([227, 163, 58]), "dark"); // 골드
  assert.equal(inkOn([255, 255, 255]), "dark"); // 화이트
});
