// 홈페이지 내용(총괄 관리자) 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTENT_FIELDS, type ContentKey, type FieldDef } from "../src/lib/content/fields.ts";
import { CONTENT_LISTS, type ListDef } from "../src/lib/content/lists.ts";
import { CONTENT_SECTIONS } from "../src/lib/content/sections.ts";
import { contentLines, isExternalLink, normalizeValue, readItem, resolveContent, storedValue, yearOf } from "../src/lib/content/values.ts";

const KEYS = Object.keys(CONTENT_FIELDS) as ContentKey[];
const def = (k: ContentKey): FieldDef => CONTENT_FIELDS[k];

test("기본값은 모두 자기 규칙을 통과한다 (비어 있지 않고 글자 수·형식이 맞음)", () => {
  for (const k of KEYS) {
    const n = normalizeValue(def(k), def(k).default);
    assert.ok(n.ok && n.value === def(k).default, k);
  }
});

test("모든 값·목록이 관리자 구역 중 정확히 한 곳에 나온다 (빠짐·중복 없음)", () => {
  const keys = CONTENT_SECTIONS.flatMap((s) => s.groups.flatMap((g) => [...g.keys]));
  assert.deepEqual([...keys].sort(), [...KEYS].sort());
  const lists = CONTENT_SECTIONS.flatMap((s) => [...s.lists]);
  assert.deepEqual([...lists].sort(), Object.keys(CONTENT_LISTS).sort());
  const ids = CONTENT_SECTIONS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("resolveContent: 저장값이 있으면 그 값, 없거나 비었거나 틀리면 기본값, 모르는 키는 무시", () => {
  const c = resolveContent({ "site.name": "새 이름", "home.hero.slogan": "   ", "site.foundedDate": "2012-02-30", "nope.key": "x" });
  assert.equal(c["site.name"], "새 이름");
  assert.equal(c["home.hero.slogan"], def("home.hero.slogan").default);
  assert.equal(c["site.foundedDate"], def("site.foundedDate").default);
  assert.equal("nope.key" in c, false);
  assert.equal(Object.keys(c).length, KEYS.length);
});

test("storedValue: 비우거나 기본값과 같으면 null(행 삭제), 바꾼 값만 저장", () => {
  assert.deepEqual(storedValue(def("site.name"), ""), { ok: true, value: null });
  assert.deepEqual(storedValue(def("site.name"), ` ${def("site.name").default} `), { ok: true, value: null });
  assert.deepEqual(storedValue(def("site.name"), "새 이름"), { ok: true, value: "새 이름" });
});

test("normalizeValue: 글자 수·날짜·주소 검사, 한 줄 칸의 줄바꿈은 공백", () => {
  assert.equal(normalizeValue(def("site.name"), "가".repeat(31)).ok, false);
  assert.deepEqual(normalizeValue(def("site.name"), "서울은평\n덴포스"), { ok: true, value: "서울은평 덴포스" });
  assert.equal(normalizeValue(def("site.foundedDate"), "2012/11/17").ok, false);
  assert.deepEqual(normalizeValue(def("site.foundedDate"), "2012-11-17"), { ok: true, value: "2012-11-17" });
  assert.equal(normalizeValue(def("nav.external.href"), "denforce.co.kr").ok, false);
  assert.equal(normalizeValue(def("nav.external.href"), "javascript:alert(1)").ok, false);
  assert.equal(normalizeValue(def("nav.external.href"), "https://denforce.co.kr").ok, true);
  for (const offsite of ["//evil.example", "/\\evil.example"]) assert.equal(normalizeValue(def("nav.external.href"), offsite).ok, false, offsite);
  assert.equal(normalizeValue(def("home.hero.image"), "http://x.com/a.jpg").ok, false); // 사진은 https 또는 사이트 안
  assert.equal(normalizeValue(def("home.hero.image"), "/photos/a.webp").ok, true);
});

test("lines: 빈 줄·앞뒤 공백을 빼고 한 줄에 하나", () => {
  assert.deepEqual(normalizeValue(def("site.alternateNames"), " 가 \r\n\n 나 \n"), { ok: true, value: "가\n나" });
  assert.deepEqual(contentLines("가\n\n 나 "), ["가", "나"]);
  assert.equal(yearOf("2012-11-17"), "2012");
});

test("readItem: 필수·글자 수·주소 검사, 쓰지 않는 칸은 빈 값", () => {
  const ql: ListDef = CONTENT_LISTS["home.quicklinks"];
  assert.deepEqual(readItem(ql, { title: " 경기일정 ", body: "", link: "/match/schedule" }), {
    values: { title: "경기일정", body: "", link: "/match/schedule" },
    errors: {},
  });
  const bad = readItem(ql, { title: "", link: "match" });
  assert.ok(bad.errors.title && bad.errors.link);
  assert.ok(readItem(ql, { title: "가".repeat(21), link: "/a" }).errors.title);
  assert.ok(readItem(ql, { title: "a", link: "//evil.example" }).errors.link);
  assert.ok(readItem(ql, { title: "a", link: "/\\evil.example" }).errors.link);
  assert.deepEqual(readItem({ ...ql, columns: { title: { label: "이름" } } }, { title: "a", body: "b", link: "c" }).values, {
    title: "a",
    body: "",
    link: "",
  });
});

test("목록 기본값은 모두 자기 규칙을 통과하고 최대 개수 안", () => {
  for (const [key, l] of Object.entries(CONTENT_LISTS) as Array<[string, ListDef]>) {
    assert.ok(l.defaults.length <= l.max, key);
    for (const d of l.defaults) assert.deepEqual(readItem(l, d).errors, {}, `${key} ${JSON.stringify(d)}`);
  }
});

test("isExternalLink: http(s) 만 바깥 사이트", () => {
  assert.equal(isExternalLink("https://denforce.co.kr"), true);
  assert.equal(isExternalLink("/sponsors"), false);
});
