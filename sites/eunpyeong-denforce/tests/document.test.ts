// 긴 문서 글 규칙(## 소제목 / - 목록 / 빈 줄 문단) 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDocument } from "../src/lib/content/document.ts";

test("parseDocument: 소제목/목록/문단", () => {
  const src = "서울은평 덴포스는\n개인정보를 보호합니다.\n\n## 1. 처리 목적\n- 문의 회신\n- 홈페이지 보안\n\n## 2. 항목\n이메일 주소\n- 접속 기록";
  assert.deepEqual(parseDocument(src), [
    { kind: "paragraph", text: "서울은평 덴포스는\n개인정보를 보호합니다." },
    { kind: "heading", text: "1. 처리 목적" },
    { kind: "list", items: ["문의 회신", "홈페이지 보안"] },
    { kind: "heading", text: "2. 항목" },
    { kind: "paragraph", text: "이메일 주소" },
    { kind: "list", items: ["접속 기록"] },
  ]);
});

test("parseDocument: 목록 뒤 글은 새 문단, 빈 줄·윈도 줄바꿈·앞뒤 공백 정리", () => {
  assert.deepEqual(parseDocument("- 가\r\n- 나\r\n다\r\n\r\n\r\n  라  "), [
    { kind: "list", items: ["가", "나"] },
    { kind: "paragraph", text: "다" },
    { kind: "paragraph", text: "라" },
  ]);
  // '##' 만 있거나 '-' 뒤에 글이 없으면 일반 글
  assert.deepEqual(parseDocument("##\n-"), [{ kind: "paragraph", text: "##\n-" }]);
  assert.deepEqual(parseDocument("   "), []);
});
