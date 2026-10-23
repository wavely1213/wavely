// 홈페이지 내용(총괄 관리자) 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { LEAGUE } from "../src/config/league.ts";
import { CONTENT_FIELDS, type ContentKey, type FieldDef } from "../src/lib/content/fields.ts";
import { CONTENT_LISTS, type ListDef } from "../src/lib/content/lists.ts";
import { CONTENT_SECTIONS, visibleSections } from "../src/lib/content/sections.ts";
import { contentCards, contentLines, isExternalLink, normalizeHex, normalizeValue, readItem, resolveContent, storedValue, yearOf } from "../src/lib/content/values.ts";

const KEYS = Object.keys(CONTENT_FIELDS) as ContentKey[];
const def = (k: ContentKey): FieldDef => CONTENT_FIELDS[k];

test("기본값은 모두 자기 규칙을 통과한다 (비어 있지 않고 글자 수/형식이 맞음)", () => {
  for (const k of KEYS) {
    const n = normalizeValue(def(k), def(k).default);
    assert.ok(n.ok && n.value === def(k).default, k);
  }
});

test("모든 값/목록이 관리자 구역 중 정확히 한 곳에 나온다 (빠짐/중복 없음)", () => {
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

test("normalizeValue: 글자 수/날짜/주소 검사, 한 줄 칸의 줄바꿈은 공백", () => {
  assert.equal(normalizeValue(def("site.name"), "가".repeat(31)).ok, false);
  assert.deepEqual(normalizeValue(def("site.name"), "서울은평\n덴포스"), { ok: true, value: "서울은평 덴포스" });
  assert.equal(normalizeValue(def("site.foundedDate"), "2012/11/17").ok, false);
  assert.deepEqual(normalizeValue(def("site.foundedDate"), "2012-11-17"), { ok: true, value: "2012-11-17" });
  assert.equal(normalizeValue(def("nav.external.href"), "denforce.co.kr").ok, false);
  assert.equal(normalizeValue(def("nav.external.href"), "javascript:alert(1)").ok, false);
  assert.equal(normalizeValue(def("nav.external.href"), "https://denforce.co.kr").ok, true);
  for (const offsite of ["//evil.example", "/\\evil.example"]) assert.equal(normalizeValue(def("nav.external.href"), offsite).ok, false, offsite);
  assert.equal(normalizeValue(def("home.hero.image"), "//x.com/a.jpg").ok, false); // 사진은 http(s) 또는 사이트 안
  assert.equal(normalizeValue(def("home.hero.image"), "javascript:alert(1)").ok, false);
  assert.equal(normalizeValue(def("home.hero.image"), "/photos/a.webp").ok, true);
});

test("lines: 빈 줄/앞뒤 공백을 빼고 한 줄에 하나", () => {
  assert.deepEqual(normalizeValue(def("site.alternateNames"), " 가 \r\n\n 나 \n"), { ok: true, value: "가\n나" });
  assert.deepEqual(contentLines("가\n\n 나 "), ["가", "나"]);
  assert.equal(yearOf("2012-11-17"), "2012");
});

test("readItem: 필수/글자 수/주소 검사, 쓰지 않는 칸은 빈 값", () => {
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

test("readItem format lines: 카드 항목은 빈 줄/앞뒤 공백을 빼고 한 줄에 하나", () => {
  const org: ListDef = CONTENT_LISTS["club.organization"];
  assert.deepEqual(readItem(org, { title: " 유소년 ", body: " U-18 \r\n\n  U-15\n " }).values, { title: "유소년", body: "U-18\nU-15", link: "" });
  assert.ok(readItem(org, { title: "유소년", body: " \n \n" }).errors.body); // 항목 필수
  assert.ok(readItem(org, { title: "", body: "a" }).errors.title);
});

test("readItem format hex: 색 코드는 '#RRGGBB' 대문자로 맞추고 틀리면 오류", () => {
  const colors: ListDef = CONTENT_LISTS["emblem.colors"];
  assert.equal(readItem(colors, { title: "로열블루", body: " 2b4fa2 " }).values.body, "#2B4FA2");
  assert.equal(readItem(colors, { title: "로열블루", body: "#2b4fa2" }).values.body, "#2B4FA2");
  for (const bad of ["#2B4FA", "#GGGGGG", "blue", "#2B4FA2;x"]) assert.ok(readItem(colors, { title: "a", body: bad }).errors.body, bad);
  assert.equal(normalizeHex("fff"), null);
  assert.equal(normalizeHex("#ffffff"), "#FFFFFF");
});

test("contentCards: 항목을 줄로 나누고, 이름이나 항목이 없는 카드는 뺀다", () => {
  const item = (id: string, title: string, body: string) => ({ id, list: "club.organization", title, body, link: "", image: null, sortOrder: 0 });
  assert.deepEqual(contentCards([item("1", "유소년", "U-18\n\n U-15 "), item("2", " ", "x"), item("3", "빈 카드", " \n")]), [
    { id: "1", title: "유소년", items: ["U-18", "U-15"] },
  ]);
});

test("유니폼 사진 기본값은 사이트 안 사진 주소, 팀 색상 기본값은 '#RRGGBB'", () => {
  for (const d of CONTENT_LISTS["kit.images"].defaults) assert.ok(d.image.startsWith("/photos/"), d.image);
  for (const d of CONTENT_LISTS["emblem.colors"].defaults) assert.equal(normalizeHex(d.body), d.body);
});

test("관리자 개편 3단계: 기본값은 그동안 페이지에 박혀 있던 글 그대로, 중간점 없음 (D-047)", () => {
  const c = resolveContent({});
  assert.equal(c["staff.section.coaching"], "코칭스태프");
  assert.equal(c["staff.section.front"], "프런트");
  assert.equal(c["schedule.empty"], `${LEAGUE.nextSeason} 시즌 일정은 ${LEAGUE.source} 발표 후 업데이트됩니다.`);
  assert.equal(c["results.empty"], "종료된 경기가 없습니다.");
  assert.equal(c["standings.basis"], "순위 기준: 승점 → 득실차 → 다득점");
  assert.equal(c["standings.empty"], "순위 정보가 없습니다.");
  assert.equal(c["standings.section.past"], "지난 리그");
  assert.equal(c["news.empty"], "게시물이 없습니다.");
  assert.equal(c["posting.empty"], "아직 모은 글이 없습니다.");
  assert.equal(c["sponsors.box.title"], "스폰서십 문의");
  assert.deepEqual(contentLines(c["sponsors.box.facts"]), ["FK리그 경기는 한국풋살연맹 유튜브로 생중계"]);
  assert.equal(c["sponsors.box.button"], "문의하기");
  assert.equal(c["contact.section.topics"], "문의 분야");
  assert.deepEqual(contentLines(c["contact.topics"]), ["스폰서십/제휴", "아카데미/유소년", "언론/취재", "기타"]);
  for (const k of KEYS) assert.ok(!def(k).default.includes("·"), k);
});

test("관리자 개편 3단계 구역: 선수단/경기/소식/스폰서/문의가 차례로 있고 '이 페이지 보기'는 사이트 안 주소", () => {
  const ids = CONTENT_SECTIONS.map((s) => s.id);
  assert.deepEqual(ids, ["common", "home", "club", "emblem", "team", "match", "news", "sponsors", "contact", "privacy"]);
  for (const s of CONTENT_SECTIONS) {
    assert.ok(s.view.startsWith("/") && !s.view.startsWith("//"), s.id);
    for (const r of s.related) assert.ok(r.href.startsWith("/admin"), `${s.id} ${r.href}`);
  }
});

test("visibleSections: 개인정보처리방침 탭은 페이지를 켤 때만 (D-055), 다른 구역은 그대로", () => {
  const off = visibleSections(false).map((s) => s.id);
  const on = visibleSections(true).map((s) => s.id);
  assert.ok(!off.includes("privacy"));
  assert.ok(on.includes("privacy"));
  assert.deepEqual(off, on.filter((id) => id !== "privacy"));
});
