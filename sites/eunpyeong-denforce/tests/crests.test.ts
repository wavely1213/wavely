// 상대팀 엠블럼 찾기 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { TEAM_CRESTS } from "../src/config/team-crests.ts";
import { crestEntryFor, crestFor } from "../src/lib/crests.ts";

test("crestFor: 띄어쓰기와 대소문자를 무시하고 찾는다", () => {
  assert.equal(crestFor("강원FS"), "/crests/gangwon.png");
  assert.equal(crestFor(" 강원 fs "), "/crests/gangwon.png");
});

test("crestFor: 별칭(예전 이름)으로도 같은 항목", () => {
  assert.equal(crestEntryFor("용인대흥FS")?.name, "용인지솔FS");
  assert.equal(crestEntryFor("노원 hr fs")?.name, "노원제너FS");
  assert.equal(crestEntryFor("전주매그풋살클럽")?.name, "전주시민풋살구단");
});

test("crestFor: 못 구한 팀, 모르는 팀, 빈 이름은 null", () => {
  assert.equal(crestFor("화성FS"), null);
  assert.equal(crestFor("없는팀"), null);
  assert.equal(crestFor("   "), null);
});

test("TEAM_CRESTS: 이름 겹침 없음, 파일은 실제로 있고 출처와 날짜가 있음, 못 구함은 이유가 있음", () => {
  const keys = TEAM_CRESTS.flatMap((e) => [e.name, ...e.aliases]).map((n) => n.replace(/\s+/g, "").toLowerCase());
  assert.equal(new Set(keys).size, keys.length);
  for (const e of TEAM_CRESTS) {
    if (e.file) {
      assert.ok(existsSync(new URL(`../public${e.file}`, import.meta.url)), e.file);
      assert.ok(e.source?.startsWith("https://") && /^\d{4}-\d{2}-\d{2}$/.test(e.fetchedAt ?? ""), e.name);
    } else {
      assert.match(e.note, /^못 구함: /, e.name);
    }
    assert.ok(!e.note.includes("·"), `${e.name} 중간점`);
  }
});
