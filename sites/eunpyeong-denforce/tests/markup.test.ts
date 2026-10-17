// 푸터 정보 줄 글(**이름표** 값 + {값 이름}) 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMarkup, parseMarkupLine, renderMarkup, renderPlain, renderSegments, renderValue, segmentsOf, serializeMarkup } from "../src/lib/content/markup.ts";

test("parseMarkupLine: 이름표/값 묶음", () => {
  assert.deepEqual(parseMarkupLine("**창단** {창단연도} **홈구장** {홈구장}"), [
    { label: "창단", value: "{창단연도}" },
    { label: "홈구장", value: "{홈구장}" },
  ]);
  assert.deepEqual(parseMarkupLine("앞글 **문의** a@b.com"), [
    { label: "", value: "앞글" },
    { label: "문의", value: "a@b.com" },
  ]);
  assert.deepEqual(parseMarkupLine("**이름표만**"), [{ label: "이름표만", value: "" }]);
  assert.deepEqual(parseMarkupLine("   "), []);
});

test("serializeMarkup ↔ parseMarkup 왕복, '*'·줄바꿈 정리", () => {
  const lines = [
    [
      { label: "창단", value: "{창단연도}" },
      { label: "홈구장", value: "{홈구장}" },
    ],
    [{ label: "", value: "그냥 글" }],
    [],
    [{ label: " 단*장 ", value: "배종현\n**x" }],
  ];
  const s = serializeMarkup(lines);
  assert.equal(s, "**창단** {창단연도} **홈구장** {홈구장}\n그냥 글\n**단장** 배종현 *x");
  assert.deepEqual(parseMarkup(s)[0], lines[0]);
  assert.equal(serializeMarkup([[{ label: "", value: "" }]]), "");
});

const tokens = { 창단연도: "2012", 홈구장: "은평다목적체육관", 사무국주소: null, 단장: "배종현", 문의메일: "jonghbae@naver.com", 문의전화: "010-5135-0309" };

test("renderValue: 값 이름 바꾸기 / 모두 비면 숨김 / 남는 슬래시 정리", () => {
  assert.equal(renderValue("{창단연도}", tokens), "2012");
  assert.equal(renderValue("{사무국주소}", tokens), null);
  assert.equal(renderValue("{문의메일} / {문의전화}", tokens), "jonghbae@naver.com / 010-5135-0309");
  assert.equal(renderValue("{문의메일} / {문의전화}", { ...tokens, 문의메일: "" }), "010-5135-0309");
  assert.equal(renderValue("{문의메일} / {문의전화}", { ...tokens, 문의전화: " " }), "jonghbae@naver.com");
  assert.equal(renderValue("{문의메일} / {문의전화}", { ...tokens, 문의메일: null, 문의전화: null }), null);
  // 값 이름이 없는 글은 그대로 (슬래시도)
  assert.equal(renderValue("https://a.com/b 1/2", tokens), "https://a.com/b 1/2");
  // 모르는 값 이름은 그대로 보인다
  assert.equal(renderValue("{오타}", tokens), "{오타}");
  assert.equal(renderValue("", tokens), null);
});

test("segmentsOf: 이메일·전화번호 조각", () => {
  assert.deepEqual(segmentsOf("jonghbae@naver.com / 010-5135-0309"), [
    { kind: "email", text: "jonghbae@naver.com" },
    { kind: "text", text: " / " },
    { kind: "phone", text: "010-5135-0309" },
  ]);
  assert.deepEqual(segmentsOf("02-123-4567 사무실"), [
    { kind: "phone", text: "02-123-4567" },
    { kind: "text", text: " 사무실" },
  ]);
  assert.deepEqual(segmentsOf("글만"), [{ kind: "text", text: "글만" }]);
});

test("renderMarkup: 지금 푸터 기본값 그대로 / 빈 묶음·빈 줄 숨김", () => {
  const src = "**창단** {창단연도} **홈구장** {홈구장}\n**사무국** {사무국주소}\n**단장** {단장} **문의** {문의메일} / {문의전화}";
  const r = renderMarkup(src, tokens);
  assert.equal(r.length, 2);
  assert.deepEqual(
    r.map((line) => line.map((g) => [g.label, g.segments.map((s) => s.text).join("")])),
    [
      [
        ["창단", "2012"],
        ["홈구장", "은평다목적체육관"],
      ],
      [
        ["단장", "배종현"],
        ["문의", "jonghbae@naver.com / 010-5135-0309"],
      ],
    ],
  );
  assert.equal(renderPlain("© {구단이름}. All rights reserved.", { 구단이름: "서울은평 덴포스" }), "© 서울은평 덴포스. All rights reserved.");
});

test("serializeMarkup: 줄 가운데 이름표 없는 칸은 '****' 로 따로 남는다 (앞 칸에 붙지 않음)", () => {
  const line = [
    { label: "문의", value: "a@b.com" },
    { label: "", value: "평일 10-18시" },
  ];
  const s = serializeMarkup([line]);
  assert.equal(s, "**문의** a@b.com **** 평일 10-18시");
  assert.deepEqual(parseMarkup(s)[0], line);
  // 줄 맨 앞(빈 칸을 뺀 뒤 첫 칸)이면 그냥 글
  assert.equal(serializeMarkup([[{ label: "", value: "" }, { label: "", value: "글" }, { label: "x", value: "" }]]), "글 **x**");
  // 관리자가 쓴 자리표 글자는 지운다
  assert.equal(serializeMarkup([[{ label: "", value: "a\uE0000\uE001b" }]]), "a0b");
});

test("renderSegments: 값 이름 종류(kinds) — 저장된 메일/전화 값 전체가 한 조각", () => {
  const kinds = { 문의메일: "email", 문의전화: "phone" } as const;
  const t = { 문의메일: "o'brien@x.com", 문의전화: "1588 1234" };
  assert.deepEqual(renderSegments("{문의메일} / {문의전화}", t, kinds), [
    { kind: "email", text: "o'brien@x.com" },
    { kind: "text", text: " / " },
    { kind: "phone", text: "1588 1234" },
  ]);
  // 하나가 비면 남는 슬래시 정리
  assert.deepEqual(renderSegments("{문의메일} / {문의전화}", { ...t, 문의메일: "" }, kinds), [{ kind: "phone", text: "1588 1234" }]);
  // 직접 쓴 글 안의 메일·전화는 모양으로 찾는다
  assert.deepEqual(
    renderSegments("문의 {문의메일} 또는 010 5135 0309", t, kinds)?.map((x) => x.kind),
    ["text", "email", "text", "phone"],
  );
});

test("segmentsOf: 여러 전화번호 모양, 숫자 중간에서 자르지 않음", () => {
  for (const p of ["1588-1234", "+82-10-5135-0309", "010 5135 0309", "02-123-4567"]) assert.deepEqual(segmentsOf(p), [{ kind: "phone", text: p }], p);
  assert.deepEqual(segmentsOf("010-1234-56789").map((x) => x.kind), ["text"]);
});
