// 검색 등록용 도우미 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { clubJsonLd, jsonLdString, sitemapEntries, STATIC_PATHS } from "../src/lib/seo.ts";

test("sitemapEntries: 고정 페이지 + 글/선수/지난 시즌, 날짜를 아는 글만 lastModified", () => {
  const list = sitemapEntries("https://eunpyeong-fs.com/", {
    news: [
      { category: "news", id: "a", date: "2026-10-06" },
      { category: "notice", id: "b", date: "2026" },
    ],
    players: [{ slug: "no-7" }],
    seasons: ["2025-26-fk1"],
  });
  assert.equal(list[0].url, "https://eunpyeong-fs.com");
  assert.equal(list.length, STATIC_PATHS.length + 4);
  assert.deepEqual(list.find((e) => e.url.endsWith("/news/news/a")), { url: "https://eunpyeong-fs.com/news/news/a", lastModified: "2026-10-06" });
  assert.deepEqual(list.find((e) => e.url.endsWith("/news/notice/b")), { url: "https://eunpyeong-fs.com/news/notice/b" });
  assert.ok(list.some((e) => e.url === "https://eunpyeong-fs.com/team/players/no-7"));
  assert.ok(list.some((e) => e.url === "https://eunpyeong-fs.com/match/standings/2025-26-fk1"));
  assert.ok(list.every((e) => !e.url.includes("/admin")));
});

test("clubJsonLd: SportsTeam, 다른 이름/SNS, 주소 없으면 address 생략", () => {
  const base = { name: "서울은평 덴포스", alternateNames: ["서울은평FS"], url: "https://eunpyeong-fs.com", logo: "https://eunpyeong-fs.com/brand/emblem.png", foundingDate: "2012-11-17", venueName: "은평다목적체육관" };
  const ld = clubJsonLd({ ...base, venueAddress: "서울시 은평구 진관1로 52", sameAs: ["https://www.instagram.com/eunpyeong_denforce"] });
  assert.equal(ld["@type"], "SportsTeam");
  assert.deepEqual(ld.alternateName, ["서울은평FS"]);
  assert.deepEqual(ld.sameAs, ["https://www.instagram.com/eunpyeong_denforce"]);
  assert.equal(ld.location.address, "서울시 은평구 진관1로 52");
  const bare = clubJsonLd({ ...base, venueAddress: null, sameAs: [] });
  assert.equal("address" in bare.location, false);
  assert.equal("sameAs" in bare, false);
});

test("jsonLdString: '<' 이스케이프로 스크립트 태그가 끊기지 않는다", () => {
  assert.equal(jsonLdString({ a: "</script>" }), '{"a":"\\u003c/script>"}');
});
