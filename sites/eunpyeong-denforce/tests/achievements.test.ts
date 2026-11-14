// 연혁 성과 띠 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { achievementItems } from "../src/lib/achievements.ts";

const h = (year: string, text: string) => ({ id: year + text, year, text });

test("achievementItems: 창단 연도 / 가장 최근 리그 우승(준우승 제외) / 국가대표 수", () => {
  const history = [h("2020-21", "FK리그 1부(슈퍼리그) 준우승"), h("2018-19", "FK리그 2부(드림리그) 우승 / 1부 승격"), h("2017-18", "FK리그 2부(드림리그) 준우승")];
  assert.deepEqual(achievementItems({ foundedDate: "2012-11-17", history, alumniCount: 11 }), [
    { label: "SINCE", value: "2012" },
    { label: "FK리그 2부(드림리그) 우승", value: "2018-19" },
    { label: "국가대표 배출", value: "11명" },
  ]);
});

test("achievementItems: 데이터가 없는 칸은 숨김 (컵 우승은 리그 우승 아님)", () => {
  assert.deepEqual(achievementItems({ foundedDate: null, history: [h("2025", "FK CUP 우승")], alumniCount: 0 }), []);
});

test("achievementItems: 조각 안에서만 '리그'와 '우승'을 함께 본다", () => {
  // 컵 우승 + 리그 잔류 — 리그 우승 아님
  assert.deepEqual(achievementItems({ foundedDate: null, history: [h("2025", "FK CUP 우승 / FK리그 1부 잔류")], alumniCount: 0 }), []);
  // 둘째 조각이 리그 우승이면 그 조각
  assert.deepEqual(achievementItems({ foundedDate: null, history: [h("2020", "FK CUP 3위 / FK리그 2부 우승")], alumniCount: 0 }), [{ label: "FK리그 2부 우승", value: "2020" }]);
});
