// 구단소식 메인 배너 고르기 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { isDeparture, kitLinks, pickBanner } from "../src/lib/news.ts";
import type { NewsPost } from "../src/types/index.ts";

const n = (id: string, title: string, thumb = true, featured = false): NewsPost => ({
  id, category: "news", title, date: "2026-10-01", thumbnail: thumb ? `/${id}.jpg` : null, images: [], summary: "", body: [], videoUrl: null, featured,
});

test("isDeparture: 이적/작별 소식", () => {
  assert.equal(isDeparture(n("a", "박영완, 이적으로 서울은평 덴포스와 동행 마무리")), true);
  assert.equal(isDeparture(n("a", "서울은평 덴포스, 장성호 감독과 동행 마무리")), true);
  assert.equal(isDeparture(n("a", "서울은평 덴포스, '든든한 수문장' 골레이로 정대연 영입")), false);
});

test("pickBanner: 고정 글이 없으면 사진 있는 최근 글(이적 제외)에서 최대 장수만큼", () => {
  const posts = [n("1", "박영완, 이적으로 서울은평 덴포스와 동행 마무리"), n("2", "유니폼 구매 안내"), n("3", "사진 없는 공지", false), n("4", "정대연 영입"), n("5", "a"), n("6", "b"), n("7", "c"), n("8", "d")];
  assert.deepEqual(pickBanner(posts).map((p) => p.id), ["2", "4", "5", "6", "7"]);
  assert.deepEqual(pickBanner(posts, 2).map((p) => p.id), ["2", "4"]);
});

test("pickBanner: 관리자가 고정한 글이 있으면 그 글만 (사진 없는 글은 제외)", () => {
  const posts = [n("1", "x"), n("2", "y", true, true), n("3", "z", false, true), n("4", "w", true, true)];
  assert.deepEqual(pickBanner(posts).map((p) => p.id), ["2", "4"]);
  assert.deepEqual(pickBanner([]), []);
});

test("kitLinks: 가장 최근 유니폼 공개 글(뉴스만), 없으면 undefined", () => {
  const post = (id: string, category: NewsPost["category"], title: string, date: string): NewsPost => ({ ...n(id, title), category, date });
  const posts = [
    post("old", "news", "25-26 HOME KIT 공개", "2025-09-01"),
    post("new", "news", "26-27 서울은평덴포스 HOME & AWAY KIT 공개", "2026-10-06"),
    post("notice", "notice", "26-27 유니폼 공개 일정 안내", "2026-10-20"),
    post("x", "notice", "홈페이지 오픈 안내", "2026-10-15"),
  ];
  assert.equal(kitLinks(posts).reveal?.id, "new", "공지사항은 빼고 뉴스 중 최근");
  assert.deepEqual(kitLinks([posts[3]]), { reveal: undefined });
});
