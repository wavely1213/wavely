import assert from "node:assert/strict";
import { test } from "node:test";
import { allTables, cleanText, decodeUtf8, KflShapeError, parseAttrs, parseTables } from "../supabase/functions/kfl-sync/html.ts";

// 연맹 HTML 표 토크나이저 (D-082, 명세 2.1)

test("중첩 표: 칸 글자는 그 칸 것만, 안쪽 표는 tables 로", () => {
  const [t] = parseTables(`<table class="a"><tr><td>1 </td><td>바깥<table><tr><td>홈</td><td>vs</td><td>원정</td></tr></table></td></tr></table>`);
  assert.equal(t.rows[0].cells[0].text, "1");
  assert.equal(t.rows[0].cells[1].text, "바깥");
  assert.deepEqual(t.rows[0].cells[1].tables[0].rows[0].cells.map((c) => c.text), ["홈", "vs", "원정"]);
  assert.equal(allTables([t]).length, 2);
});

test("속성: 큰따옴표, 작은따옴표(colspan='22'), 따옴표 없음", () => {
  assert.deepEqual(parseAttrs(` class="record_text_bg2" colspan='22' height=252 nowrap`), { class: "record_text_bg2", colspan: "22", height: "252", nowrap: "" });
});

test("cleanText: 엔티티(세미콜론 없는 &nbsp 포함), U+FEFF, NFC(NFKC 아님), 공백 줄이기", () => {
  assert.equal(cleanText("&nbsp&nbsp1&nbsp;&amp;&#51060;&#xAE40;﻿  a\n b "), "1 &이김 a b");
  // 자모로 나뉜 글자는 NFC 로 합친다, 전각 숫자는 그대로(NFKC 아님)
  assert.equal(cleanText("가 １"), "가 １");
  assert.equal(cleanText("&#99999999;"), "&#99999999;");
});

test("닫히지 않은 tr / td 는 다음 tr / td / </table> 에서 닫는다 (방어)", () => {
  const [t] = parseTables(`<table><tr><td>a<td>b<tr><td>c</table>`);
  assert.deepEqual(t.rows.map((r) => r.cells.map((c) => c.text)), [["a", "b"], ["c"]]);
});

test("script / 주석 안의 표 모양은 무시, <br> 은 줄바꿈", () => {
  const [t, ...rest] = parseTables(`<script>var s='<table><tr><td>x</td></tr></table>'</script><!-- <table> --><table><tr><td>비<br />고</td></tr></table>`);
  assert.equal(rest.length, 0);
  assert.equal(t.rows[0].cells[0].text, "비 고");
});

test("UTF-8 만 받는다", () => {
  assert.equal(decodeUtf8(new TextEncoder().encode("은평"), "text/html;charset=UTF-8"), "은평");
  assert.throws(() => decodeUtf8(new Uint8Array([0xc0]), "text/html; charset=euc-kr"), KflShapeError);
  assert.throws(() => decodeUtf8(new Uint8Array(), null), KflShapeError);
});
