// 본문 주소 링크 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { linkify } from "../src/lib/linkify.ts";

const links = (s: string) => linkify(s).filter((p) => p.type === "link");

test("linkify: 도메인/경로를 https 링크로, 뒤 괄호/문장부호는 뺀다", () => {
  const parts = linkify("구매: denforce.co.kr/proshop (덴포스 홈페이지 상단 메뉴 '서울은평덴포스')");
  assert.deepEqual(parts[0], { type: "text", value: "구매: " });
  assert.deepEqual(parts[1], { type: "link", value: "denforce.co.kr/proshop", href: "https://denforce.co.kr/proshop" });
  assert.equal(parts[2].value, " (덴포스 홈페이지 상단 메뉴 '서울은평덴포스')");
  assert.deepEqual(links("자세한 내용은 https://example.com/a?b=1."), [
    { type: "link", value: "https://example.com/a?b=1", href: "https://example.com/a?b=1" },
  ]);
  assert.deepEqual(links("(www.futsal.or.kr)"), [{ type: "link", value: "www.futsal.or.kr", href: "https://www.futsal.or.kr" }]);
});

test("linkify: 이메일/인스타그램 핸들/일반 문장은 링크로 만들지 않는다", () => {
  assert.equal(links("문의 futbol10@naver.com").length, 0);
  assert.equal(links("스폰서: 덴포스 스포츠(@denforce_sports), 피크폼(@peakform.tr)").length, 0);
  assert.equal(links("2025-26 시즌 각 35,000원. 결제 후 취소 불가.").length, 0);
});

test("linkify: 링크가 없으면 원문 그대로 한 조각", () => {
  assert.deepEqual(linkify("안녕하세요"), [{ type: "text", value: "안녕하세요" }]);
  assert.deepEqual(linkify(""), []);
});
