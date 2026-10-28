// 오시는 길 안내 글 나누기 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { infoLines } from "../src/lib/club.ts";

test("infoLines: 줄바꿈/' / '로 나누고, 짧은 이름 뒤 ':'는 이름으로", () => {
  assert.deepEqual(infoLines("지하철: 3호선 구파발역 2번/3번 출구\n버스: 571, 7720번 / 걸어서 약 8분"), [
    { label: "지하철", text: "3호선 구파발역 2번/3번 출구" },
    { label: "버스", text: "571, 7720번" },
    { label: null, text: "걸어서 약 8분" },
  ]);
});

test("infoLines: 빈 줄/앞뒤 공백 정리, 붙여 쓴 '/'와 긴 앞부분의 ':'는 나누지 않음", () => {
  assert.deepEqual(infoLines("  2번/3번 출구  \r\n\r\n"), [{ label: null, text: "2번/3번 출구" }]);
  assert.deepEqual(infoLines("체육관 야외주차장은 경기일에 붐빕니다: 대중교통 권장"), [
    { label: null, text: "체육관 야외주차장은 경기일에 붐빕니다: 대중교통 권장" },
  ]);
  assert.deepEqual(infoLines(""), []);
});
