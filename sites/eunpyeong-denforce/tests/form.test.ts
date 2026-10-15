// 관리자 폼 검증 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { dbErrorMessage, FormReader, isoToKst, kstToIso, submittedValues } from "../src/lib/admin/form.ts";

const fd = (entries: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
};

test("text: 필수 값이 비면 오류, 공백은 잘라낸다", () => {
  const r = new FormReader(fd({ name: "  홍길동  ", empty: "   " }));
  assert.equal(r.text("name", { label: "이름" }), "홍길동");
  r.text("empty", { label: "제목" });
  assert.equal(r.errors.empty, "제목을(를) 입력해 주세요.");
});

test("text: 최대 길이·패턴 검사", () => {
  const r = new FormReader(fd({ a: "abcdef", slug: "No 10" }));
  r.text("a", { label: "A", max: 5 });
  r.text("slug", { label: "주소", pattern: /^[a-z0-9-]+$/ });
  assert.ok(r.errors.a.includes("5자 이하"));
  assert.ok(r.errors.slug);
});

test("optText: 비면 null, 오류 없음", () => {
  const r = new FormReader(fd({ x: "" }));
  assert.equal(r.optText("x", { label: "X" }), null);
  assert.equal(r.hasErrors, false);
});

test("int: 숫자 형식·범위·필수", () => {
  const r = new FormReader(fd({ ok: "7", bad: "7.5", low: "-1", empty: "" }));
  assert.equal(r.int("ok", { label: "번호", min: 0, max: 99 }), 7);
  r.int("bad", { label: "번호" });
  r.int("low", { label: "출전", min: 0 });
  assert.equal(r.int("empty", { label: "선택" }), null);
  r.int("empty", { label: "승", required: true });
  assert.ok(r.errors.bad.includes("숫자"));
  assert.ok(r.errors.low.includes("0 이상"));
  assert.ok(r.errors.empty.includes("입력"));
});

test("bool·choice", () => {
  const r = new FormReader(fd({ on: "on", tier: "official", wrong: "gold" }));
  assert.equal(r.bool("on"), true);
  assert.equal(r.bool("missing"), false);
  assert.equal(r.choice("tier", ["naming", "official", "partner"] as const, "등급"), "official");
  r.choice("wrong", ["naming", "official"] as const, "등급");
  assert.ok(r.errors.wrong);
});

test("optUrl·optDate", () => {
  const r = new FormReader(fd({ u1: "https://a.kr", u2: "javascript:alert(1)", d1: "2026-10-15", d2: "2026-13-40", d3: "15/10/2026" }));
  assert.equal(r.optUrl("u1", "링크"), "https://a.kr");
  r.optUrl("u2", "링크");
  assert.equal(r.optDate("d1", "날짜"), "2026-10-15");
  r.optDate("d2", "날짜");
  r.optDate("d3", "날짜");
  assert.ok(r.errors.u2 && r.errors.d2 && r.errors.d3);
  assert.equal(r.errors.u1, undefined);
});

test("state: 오류와 제출값(비밀번호·파일 제외)을 돌려준다", () => {
  const f = fd({ name: "x", password: "secret" });
  f.append("logo", new File(["x"], "a.png", { type: "image/png" }));
  const r = new FormReader(f);
  r.text("missing", { label: "필수" });
  const s = r.state();
  assert.equal(s.errors?.missing, "필수을(를) 입력해 주세요.");
  assert.deepEqual(s.values, { name: "x" });
  assert.deepEqual(submittedValues(f), { name: "x" });
});

test("kstToIso / isoToKst 왕복", () => {
  const iso = kstToIso("2026-10-24", "15:00");
  assert.equal(iso, "2026-10-24T15:00:00+09:00");
  assert.deepEqual(isoToKst("2026-10-24T06:00:00+00:00"), { date: "2026-10-24", time: "15:00" });
  assert.deepEqual(isoToKst("2026-10-24T15:30:00Z"), { date: "2026-10-25", time: "00:30" });
  assert.equal(kstToIso("2026-10-24", "25:00"), null);
  assert.equal(kstToIso("bad", "15:00"), null);
});

test("dbErrorMessage: 내부 정보 없이 사용자 문구", () => {
  assert.ok(dbErrorMessage({ code: "23505", message: "duplicate key value violates unique constraint players_slug_key" }).includes("중복"));
  assert.ok(dbErrorMessage({ code: "42501" }).includes("권한"));
  assert.ok(!dbErrorMessage({ code: "XX000", message: "secret internals" }).includes("secret"));
});

test("isCalendarDate: 없는 날짜·0000년 거부 (Date.parse 넘김 방지)", async () => {
  const { isCalendarDate } = await import("../src/lib/admin/form.ts");
  assert.equal(isCalendarDate("2024-02-29"), true);
  assert.equal(isCalendarDate("2023-02-29"), false);
  assert.equal(isCalendarDate("2000-02-30"), false);
  assert.equal(isCalendarDate("2000-04-31"), false);
  assert.equal(isCalendarDate("0000-01-01"), false);
  assert.equal(kstToIso("2026-02-30", "15:00"), null);
  assert.equal(kstToIso("2026-10-24", "24:00"), null);
});
