// 페이지별 검색 설명 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { SITE_DESCRIPTION } from "../src/config/site.ts";
import { type DescriptionPath, newsCategoryDescription, pageDescription, pastLeagueDescription } from "../src/lib/page-descriptions.ts";

const PATHS: DescriptionPath[] = [
  "/club", "/club/history", "/club/emblem", "/club/location", "/team/players", "/team/staff", "/match/schedule",
  "/match/results", "/match/standings", "/news", "/news/posting", "/sponsors", "/contact", "/privacy", "/sitemap",
];
const V = { club: "서울은평 덴포스", homeVenue: "은평다목적체육관", competition: "2026-27 FK1리그" };

test("pageDescription: 페이지마다 다르고, 구단 이름으로 시작, 중간점 없음(D-047), 검색 결과에 다 보일 길이", () => {
  const all = PATHS.map((p) => pageDescription(p, V));
  assert.equal(new Set(all).size, PATHS.length);
  for (const d of all) {
    assert.ok(d.startsWith(V.club), d);
    assert.ok(!d.includes("·"), d);
    assert.ok(d.length <= 80, d);
    assert.notEqual(d, SITE_DESCRIPTION);
  }
});

test("pageDescription: 관리자 값(구단 이름·홈구장)과 시즌을 넣는다", () => {
  const v = { club: "새 이름", homeVenue: "새 체육관", competition: "2027-28 FK1리그" };
  assert.equal(pageDescription("/club/location", v), "새 이름 오시는 길 - 홈구장 새 체육관 위치와 대중교통, 주차 안내");
  assert.ok(pageDescription("/match/schedule", v).includes("2027-28 FK1리그"));
  assert.ok(pageDescription("/match/standings", v).includes("2027-28 FK1리그"));
});

test("pastLeagueDescription / newsCategoryDescription", () => {
  assert.equal(pastLeagueDescription("서울은평 덴포스", "2024-25 FK1리그"), "서울은평 덴포스 2024-25 FK1리그 최종 순위와 경기 결과");
  assert.equal(newsCategoryDescription("서울은평 덴포스", "news"), "서울은평 덴포스 구단뉴스 - 선수 영입/이적과 구단 소식");
  const cats = (["notice", "news", "photo", "video"] as const).map((c) => newsCategoryDescription("서울은평 덴포스", c));
  assert.equal(new Set(cats).size, 4);
});

test("SITE_DESCRIPTION: '프로팀'이라 부르지 않는다 (FK리그는 세미프로)", () => {
  assert.ok(!SITE_DESCRIPTION.includes("프로팀"));
});
