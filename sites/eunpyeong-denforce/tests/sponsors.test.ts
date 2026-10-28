// 스폰서 도우미(메인 띠, /sponsors 등급별 격자/문의 상자) 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { LEAGUE } from "../src/config/league.ts";
import { SPONSORS, SPONSOR_TIER_LABEL, SPONSOR_TIER_ORDER } from "../src/data/sponsors.ts";
import { MARQUEE_MIN_ITEMS, MARQUEE_SECONDS_PER_ITEM, groupSponsorsByTier, leagueEntryLine, marqueeLoop, sortByTier } from "../src/lib/sponsors.ts";
import type { SponsorTier } from "../src/types/index.ts";

test("marqueeLoop: 빈 목록이면 칸 없음", () => {
  assert.deepEqual(marqueeLoop([]), { cells: [], seconds: 0 });
});

test("marqueeLoop: 절반을 최소 칸 수까지 되풀이하고 같은 절반을 한 번 더 붙인다", () => {
  const { cells, seconds } = marqueeLoop(["a", "b", "c", "d", "e"], 12);
  // 5곳 → 한 바퀴 15칸(3회 반복), 전체 30칸
  assert.equal(cells.length, 30);
  const items = cells.map((c) => c.item);
  assert.deepEqual(items.slice(0, 15), items.slice(15));
  assert.deepEqual(items.slice(0, 6), ["a", "b", "c", "d", "e", "a"]);
  assert.equal(seconds, 15 * MARQUEE_SECONDS_PER_ITEM);
});

test("marqueeLoop: 맨 앞 한 벌만 실제 목록, 나머지는 복제 / key 는 겹치지 않음", () => {
  const { cells } = marqueeLoop(["a", "b", "c", "d", "e", "f"], 12);
  assert.deepEqual(cells.filter((c) => !c.clone).map((c) => c.item), ["a", "b", "c", "d", "e", "f"]);
  assert.equal(cells.length, 24);
  assert.equal(new Set(cells.map((c) => c.key)).size, cells.length);
});

test("marqueeLoop: 기본 최소 칸 수로 한 바퀴가 4K 화면(3840px)을 가장 좁은 칸(144px)으로도 덮는다", () => {
  const half = marqueeLoop(["a", "b", "c", "d", "e", "f"]).cells.length / 2;
  assert.ok(half >= MARQUEE_MIN_ITEMS);
  assert.ok(MARQUEE_MIN_ITEMS * 144 >= 3840);
});

test("marqueeLoop: 최소 칸 수보다 많으면 되풀이 없이 두 벌", () => {
  const list = Array.from({ length: 14 }, (_, i) => i);
  assert.equal(marqueeLoop(list, 12).cells.length, 28);
});

test("SPONSOR_TIER_LABEL: 4등급이 높은 순(네이밍/메인/서브/후원사)으로, 등급 순서와 같은 키 순서", () => {
  assert.deepEqual(Object.entries(SPONSOR_TIER_LABEL), [
    ["naming", "네이밍 스폰서"],
    ["official", "메인 스폰서"],
    ["sub", "서브 스폰서"],
    ["partner", "후원사"],
  ]);
  // 관리자 등급 선택 목록(라벨 키 순서)과 화면 묶음 순서(SPONSOR_TIER_ORDER)가 같아야 한다
  assert.deepEqual(Object.keys(SPONSOR_TIER_LABEL), [...SPONSOR_TIER_ORDER]);
});

const sp = (id: string, tier: SponsorTier) => ({ id, tier });
// 관리자 표시 순서(sort_order)대로 받은 목록 — 등급이 섞여 있다
const MIXED = [sp("a", "partner"), sp("b", "sub"), sp("c", "naming"), sp("d", "partner"), sp("e", "official"), sp("f", "sub"), sp("g", "official")];

test("groupSponsorsByTier: 높은 등급부터 묶고, 같은 등급 안은 받은 순서 그대로", () => {
  assert.deepEqual(
    groupSponsorsByTier(MIXED).map((g) => [g.tier, g.items.map((s) => s.id)]),
    [
      ["naming", ["c"]],
      ["official", ["e", "g"]],
      ["sub", ["b", "f"]],
      ["partner", ["a", "d"]],
    ],
  );
});

test("groupSponsorsByTier: 스폰서가 없는 등급은 묶음을 만들지 않는다", () => {
  const groups = groupSponsorsByTier([sp("a", "partner"), sp("b", "naming"), sp("c", "partner")]);
  assert.deepEqual(groups.map((g) => g.tier), ["naming", "partner"]);
  assert.ok(groups.every((g) => g.items.length > 0));
});

test("groupSponsorsByTier / sortByTier: 빈 목록이면 빈 결과", () => {
  assert.deepEqual(groupSponsorsByTier([]), []);
  assert.deepEqual(sortByTier([]), []);
});

test("groupSponsorsByTier: 받은 항목 객체를 그대로 돌려준다 (빠짐/겹침 없음)", () => {
  const groups = groupSponsorsByTier(MIXED);
  const flat = groups.flatMap((g) => g.items);
  assert.equal(flat.length, MIXED.length);
  assert.ok(MIXED.every((s) => flat.includes(s)));
});

test("sortByTier: 메인 띠 순서 = 등급 순서, 같은 등급 안은 받은 순서 / 원본 목록은 바꾸지 않는다", () => {
  const before = MIXED.map((s) => s.id);
  assert.deepEqual(sortByTier(MIXED).map((s) => s.id), ["c", "e", "g", "b", "f", "a", "d"]);
  assert.deepEqual(MIXED.map((s) => s.id), before);
});

test("sortByTier: 정적 목록이면 네이밍(덴포스스포츠) → 메인(은평 3곳) → 후원사, 같은 등급은 원래 순서", () => {
  assert.deepEqual(sortByTier(SPONSORS).map((s) => s.name), [
    "덴포스스포츠",
    "은평구",
    "은평구체육회",
    "은평풋살연맹",
    "스매싱스포츠",
    "스카로",
    "엑스트라조스",
    "풋살사관학교",
    "꽁병지TV",
    "토탈스포츠컴퍼니",
  ]);
});

test("leagueEntryLine: 지금 시즌 대회명 → 리그 참가 한 줄", () => {
  assert.equal(leagueEntryLine("2026-27 FK1리그"), "2026-27 시즌 FK리그 1부(FK1) 참가");
  assert.equal(leagueEntryLine("2027-28 FK2리그"), "2027-28 시즌 FK리그 2부(FK2) 참가");
  // 지금 시즌 설정(config/league.ts)이 이 형식이어야 스폰서 페이지에 줄이 보인다
  assert.ok(leagueEntryLine(LEAGUE.currentCompetition));
});

test("leagueEntryLine: 시즌 연도나 부가 없는 대회명은 null (줄을 숨긴다)", () => {
  assert.equal(leagueEntryLine("2026 FK CUP"), null);
  assert.equal(leagueEntryLine("2025-26 승강 플레이오프"), null);
  assert.equal(leagueEntryLine(""), null);
});
