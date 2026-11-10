// 상대팀 엠블럼 찾기 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { TEAM_CRESTS } from "../src/config/team-crests.ts";
import { crestEntryFor, crestFor, crestImageFor } from "../src/lib/crests.ts";

test("crestFor: 띄어쓰기와 대소문자를 무시하고 찾는다", () => {
  assert.equal(crestFor("강원FS"), "/crests/gangwon.png");
  assert.equal(crestFor(" 강원 fs "), "/crests/gangwon.png");
});

test("crestFor: 별칭(예전 이름)으로도 같은 항목", () => {
  assert.equal(crestEntryFor("용인대흥FS")?.name, "용인지솔FS");
  assert.equal(crestEntryFor("노원 hr fs")?.name, "노원제너FS");
  assert.equal(crestEntryFor("전주매그풋살클럽")?.name, "전주시민풋살구단");
});

test("crestFor: 8팀과 별칭 모두 찾음 (총괄 863f54b)", () => {
  const cases: Array<[string, string]> = [
    ["강원FS", "/crests/gangwon.png"],
    ["화성FS", "/crests/hwaseong.png"],
    ["고양불스풋살클럽", "/crests/goyang.png"],
    ["고양불스", "/crests/goyang.png"],
    ["용인지솔FS", "/crests/yongin.png"],
    ["용인대흥FS", "/crests/yongin.png"],
    ["노원제너FS", "/crests/nowon.png"],
    ["노원제너 FS", "/crests/nowon.png"],
    ["노원FS", "/crests/nowon.png"],
    ["노원HR FS", "/crests/nowon.png"],
    ["전주시민풋살구단", "/crests/jeonju.png"],
    ["전주매그풋살클럽", "/crests/jeonju.png"],
    ["경기LBFS", "/crests/lbfs.png"],
  ];
  for (const [name, file] of cases) assert.equal(crestFor(name), file, name);
});

test("crestFor: 못 구한 팀, 모르는 팀, 빈 이름은 null", () => {
  assert.equal(crestFor("인천ZD스포츠"), null);
  assert.equal(crestFor("없는팀"), null);
  assert.equal(crestFor("   "), null);
});

test("TEAM_CRESTS: 이름 겹침 없음, 파일은 실제로 있고 출처와 날짜가 있음, 못 구함은 이유가 있음", () => {
  const keys = TEAM_CRESTS.flatMap((e) => [e.name, ...e.aliases]).map((n) => n.replace(/\s+/g, "").toLowerCase());
  assert.equal(new Set(keys).size, keys.length);
  for (const e of TEAM_CRESTS) {
    if (e.file) {
      const url = new URL(`../public${e.file}`, import.meta.url);
      assert.ok(existsSync(url), e.file);
      // PNG 머리(IHDR)의 가로/세로가 적어 둔 픽셀과 같고, 긴 변 256 이상
      const png = readFileSync(url);
      assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], e.pixels, e.file);
      assert.ok(Math.max(...(e.pixels ?? [0])) >= 256, e.file);
      assert.ok(e.source?.startsWith("https://") && /^\d{4}-\d{2}-\d{2}$/.test(e.fetchedAt ?? ""), e.name);
    } else {
      assert.match(e.note, /^못 구함: /, e.name);
      assert.equal(e.pixels, null, e.name);
    }
    assert.ok(!e.note.includes("·"), `${e.name} 중간점`);
  }
});

test("crestImageFor: 경로와 원본 크기, 없으면 null", () => {
  assert.deepEqual(crestImageFor("강원 FS"), { src: "/crests/gangwon.png", width: 256, height: 264 });
  assert.equal(crestImageFor("인천ZD스포츠"), null);
  assert.deepEqual(crestImageFor("경기LBFS"), { src: "/crests/lbfs.png", width: 233, height: 281 });
});
