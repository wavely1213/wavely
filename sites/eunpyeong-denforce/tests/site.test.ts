// 메뉴 설정 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { NAV, NAV_EXTERNAL, findSection } from "../src/config/site.ts";

test("NAV_EXTERNAL: https 외부 주소이고 내부 메뉴(하위 탭·사이트맵)에는 섞이지 않는다", () => {
  assert.match(NAV_EXTERNAL.href, /^https:\/\//);
  assert.ok(NAV.every((item) => item.href.startsWith("/")));
  assert.equal(findSection("/news/photo")?.label, "구단소식");
});
