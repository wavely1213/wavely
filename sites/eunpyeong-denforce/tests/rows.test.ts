// DB 행 → 도메인 변환 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { splitParagraphs, toClubSettings, toMatch, toNewsPost, toPlayer, toPosting } from "../src/lib/data/rows.ts";

test("splitParagraphs: 빈 줄 기준, 공백 줄·앞뒤 공백 정리", () => {
  assert.deepEqual(splitParagraphs("첫 문단\n이어짐\n\n  둘째 문단  \n \n\n셋째"), ["첫 문단\n이어짐", "둘째 문단", "셋째"]);
  assert.deepEqual(splitParagraphs(""), []);
});

test("toMatch: 종료 경기만 스코어, 예정은 null", () => {
  const base = { id: "1", competition: "FK", round: "1R", kickoff: "2026-10-03T06:00:00+00:00", venue: "v", is_home: true, opponent: "A" };
  assert.deepEqual(toMatch({ ...base, status: "finished", score_us: 4, score_them: 2 }).score, { us: 4, them: 2 });
  assert.equal(toMatch({ ...base, status: "scheduled", score_us: null, score_them: null }).score, null);
  assert.equal(toMatch({ ...base, status: "finished", score_us: null, score_them: 1 }).score, null);
});

test("toPlayer: 통계 묶음·사진 필드명 변환", () => {
  const p = toPlayer({ id: "u", slug: "no-10", number: 10, name: "선수", position: "ALA", photo_url: "x.webp", birth: null, height_cm: 175, apps: 3, goals: 2, assists: 1, is_active: true });
  assert.equal(p.photo, "x.webp");
  assert.equal(p.heightCm, 175);
  assert.deepEqual(p.stats, { apps: 3, goals: 2, assists: 1 });
});

test("toNewsPost: 본문 문단 분리", () => {
  const n = toNewsPost({ id: "n", category: "notice", title: "t", date: "2026", thumbnail_url: null, images: [], summary: "", body: "a\n\nb", published: true, created_at: "" });
  assert.deepEqual(n.body, ["a", "b"]);
  assert.equal(n.thumbnail, null);
  assert.deepEqual(n.images, []);
});

test("toNewsPost: 썸네일이 없으면 첫 사진을 목록 카드에 쓴다 (BR-015)", () => {
  const base = { id: "n", category: "news" as const, title: "t", date: "2026", summary: "", body: "", published: true, created_at: "" };
  assert.equal(toNewsPost({ ...base, thumbnail_url: null, images: ["p1", "p2"] }).thumbnail, "p1");
  assert.equal(toNewsPost({ ...base, thumbnail_url: "t1", images: ["p1"] }).thumbnail, "t1");
  // 마이그레이션 전 DB (images 열 없음)
  const old = toNewsPost({ ...base, thumbnail_url: null } as Parameters<typeof toNewsPost>[0]);
  assert.deepEqual(old.images, []);
  assert.equal(old.thumbnail, null);
});

test("toClubSettings: intro 문단 분리", () => {
  const c = toClubSettings({ intro: "가\n\n나", contact_email: null, contact_phone: null, contact_address: null, instagram_url: null, youtube_url: null, venue_address: null, venue_transit: null, venue_parking: null });
  assert.deepEqual(c.intro, ["가", "나"]);
});

test("toPosting: 날짜·썸네일 필드명 변환", () => {
  const r = toPosting({ id: "p", kind: "fan", platform: "naver_blog", title: "t", author: "a", excerpt: "e", url: "https://x", thumbnail_url: null, posted_on: "2026-04-08", published: true, created_at: "" });
  assert.equal(r.date, "2026-04-08");
  assert.equal(r.thumbnail, null);
  assert.equal(r.platform, "naver_blog");
});
