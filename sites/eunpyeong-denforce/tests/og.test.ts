// 링크 미리보기 이미지 고르기 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_PREVIEW, DEFAULT_PREVIEW_VERSION, previewImage } from "../src/lib/og.ts";

const CUSTOM = "https://vunnzagbsrujdernvetl.supabase.co/storage/v1/object/public/media/og/a.jpg";

test("previewImage: 올린 이미지가 없으면 기본 이미지(크기 포함)", () => {
  for (const empty of [null, undefined, "", "   "]) {
    assert.deepEqual(previewImage("site", empty, "서울은평 덴포스"), DEFAULT_PREVIEW.site);
    assert.deepEqual(previewImage("admin", empty, "서울은평 덴포스"), DEFAULT_PREVIEW.admin);
  }
  assert.equal(DEFAULT_PREVIEW.site.width, 1200);
  assert.equal(DEFAULT_PREVIEW.site.height, 630);
});

test("previewImage: 사이트용과 관리자용 기본 이미지는 서로 다르고, 주소에 버전이 붙는다", () => {
  assert.notEqual(DEFAULT_PREVIEW.site.url, DEFAULT_PREVIEW.admin.url);
  assert.notEqual(DEFAULT_PREVIEW.site.alt, DEFAULT_PREVIEW.admin.alt);
  for (const img of Object.values(DEFAULT_PREVIEW)) assert.ok(img.url.endsWith(`?v=${DEFAULT_PREVIEW_VERSION}`), img.url);
});

test("previewImage: 올린 이미지가 있으면 그 주소 + 대체 텍스트, 크기는 넣지 않는다", () => {
  assert.deepEqual(previewImage("site", CUSTOM, "서울은평 덴포스"), { url: CUSTOM, alt: "서울은평 덴포스" });
  assert.deepEqual(previewImage("admin", ` ${CUSTOM} `, "서울은평 덴포스"), { url: CUSTOM, alt: "서울은평 덴포스 관리자" });
});
