// 여러 장 이미지 필드 계산 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_NEWS_IMAGES, planImageList } from "../src/lib/admin/image-list.ts";

test("planImageList: 지울 것만 빼고 순서 유지", () => {
  const p = planImageList(["a", "b", "c"], ["b"], 2, 10);
  assert.deepEqual(p.kept, ["a", "c"]);
  assert.deepEqual(p.removed, ["b"]);
  assert.equal(p.overLimit, false);
});

test("planImageList: 현재 목록에 없는 삭제 요청은 무시 (다른 파일을 지우게 할 수 없음)", () => {
  const p = planImageList(["a"], ["https://evil.example/x.jpg", "a"], 0, 10);
  assert.deepEqual(p.kept, []);
  assert.deepEqual(p.removed, ["a"]);
});

test("planImageList: 남길 사진 + 새 사진이 상한을 넘으면 overLimit", () => {
  const almost = Array.from({ length: MAX_NEWS_IMAGES - 1 }, (_, i) => `u${i}`);
  assert.equal(planImageList(almost, [], 1, MAX_NEWS_IMAGES).overLimit, false);
  assert.equal(planImageList(almost, [], 2, MAX_NEWS_IMAGES).overLimit, true);
  // 지우면서 올리면 자리가 생긴다
  assert.equal(planImageList(almost, ["u0"], 2, MAX_NEWS_IMAGES).overLimit, false);
});
