// 포스팅 목록 도우미 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { byPostedDesc, countByKind, filterPostings, isPreshrunkThumbnail, platformCounts } from "../src/lib/postings.ts";
import type { Posting } from "../src/types/index.ts";

const p = (id: string, kind: Posting["kind"], platform: Posting["platform"], date: string, title = id): Posting => ({
  id,
  kind,
  platform,
  title,
  author: "",
  url: `https://example.com/${id}`,
  thumbnail: null,
  date,
});

const list = [
  p("a", "club", "youtube", "2026-01-02"),
  p("b", "news", "article", "2026-03-01"),
  p("c", "fan", "naver_blog", "2026-03-01", "가"),
  p("d", "fan", "naver_cafe", "2025-12-31"),
  p("e", "fan", "naver_blog", "2024-05-05"),
];

test("byPostedDesc: 최근 먼저, 같은 날이면 제목 가나다순", () => {
  assert.deepEqual([...list].sort(byPostedDesc).map((x) => x.id), ["c", "b", "a", "d", "e"]);
});

test("filterPostings: 분류·출처 (null = 전체)", () => {
  assert.equal(filterPostings(list, { kind: null, platform: null }).length, 5);
  assert.deepEqual(filterPostings(list, { kind: "fan", platform: null }).map((x) => x.id), ["c", "d", "e"]);
  assert.deepEqual(filterPostings(list, { kind: "fan", platform: "naver_blog" }).map((x) => x.id), ["c", "e"]);
  assert.deepEqual(filterPostings(list, { kind: "club", platform: "naver_blog" }), []);
});

test("countByKind: 전체·분류별 개수", () => {
  assert.deepEqual(countByKind(list), { all: 5, club: 1, news: 1, fan: 3, league: 0 });
  assert.deepEqual(countByKind([]), { all: 0, club: 0, news: 0, fan: 0, league: 0 });
  assert.deepEqual(countByKind([...list, p("f", "league", "youtube", "2026-02-01")]), { all: 6, club: 1, news: 1, fan: 3, league: 1 });
});

test("platformCounts: 고른 분류 안에서 글 있는 출처만, 많은 순 → 같으면 정해진 순서", () => {
  assert.deepEqual(platformCounts(list, "fan"), [
    { platform: "naver_blog", count: 2 },
    { platform: "naver_cafe", count: 1 },
  ]);
  assert.deepEqual(
    platformCounts(list, null).map((c) => c.platform),
    ["naver_blog", "naver_cafe", "article", "youtube"],
  );
});

test("isPreshrunkThumbnail: 일괄 적재 사진(url 해시 16자 .jpg)만 true, 관리자 업로드(uuid)는 false", () => {
  const base = "https://x.supabase.co/storage/v1/object/public/media/postings/";
  assert.equal(isPreshrunkThumbnail(`${base}f204c86537b82aa3.jpg`), true);
  assert.equal(isPreshrunkThumbnail(`${base}0b6f2a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b.jpg`), false);
  assert.equal(isPreshrunkThumbnail(`${base}f204c86537b82aa3.png`), false);
  assert.equal(isPreshrunkThumbnail("https://x.supabase.co/storage/v1/object/public/media/news/f204c86537b82aa3.jpg"), false);
});
