// 링크 미리보기 이미지 고르기 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { articleImage, DEFAULT_PREVIEW, DEFAULT_PREVIEW_VERSION, previewImage, previewMeta } from "../src/lib/og.ts";

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

test("previewMeta: 공통 항목(사이트 이름·언어·이미지) + 비운 제목·설명은 넣지 않음", () => {
  const m = previewMeta({ siteName: "서울은평 덴포스", image: DEFAULT_PREVIEW.site, title: "  ", description: null });
  assert.deepEqual(m.openGraph, { type: "website", siteName: "서울은평 덴포스", locale: "ko_KR", images: [DEFAULT_PREVIEW.site] });
  assert.deepEqual(m.twitter, { card: "summary_large_image", images: [DEFAULT_PREVIEW.site] });
});

test("previewMeta: 제목·설명이 있으면 openGraph·twitter 둘 다, 글은 article + 날짜(YYYY-MM-DD 만)", () => {
  const image = { url: CUSTOM, alt: "글" };
  const m = previewMeta({ siteName: "서울은평 덴포스", image, title: " 제목 ", description: "요약", type: "article", publishedTime: "2026-10-13" });
  assert.deepEqual(m.openGraph, { type: "article", siteName: "서울은평 덴포스", locale: "ko_KR", title: "제목", description: "요약", images: [image], publishedTime: "2026-10-13" });
  assert.deepEqual(m.twitter, { card: "summary_large_image", title: "제목", description: "요약", images: [image] });
  for (const bad of ["2026", "", null]) {
    const og = previewMeta({ siteName: "s", image, type: "article", publishedTime: bad }).openGraph as Record<string, unknown>;
    assert.equal("publishedTime" in og, false, String(bad));
  }
});

test("articleImage: 대표 사진 → 상세 첫 사진 → null", () => {
  assert.equal(articleImage({ thumbnail: "a.jpg", images: ["b.jpg"] }), "a.jpg");
  assert.equal(articleImage({ thumbnail: null, images: ["b.jpg", "c.jpg"] }), "b.jpg");
  assert.equal(articleImage({ thumbnail: null, images: [] }), null);
});
