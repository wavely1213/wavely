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

test("crestFor: 12팀과 별칭 모두 찾음 (총괄 863f54b, 58ed10d)", () => {
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
    ["구미FS", "/crests/gumi.png"],
    ["대구FS", "/crests/daegu.png"],
    ["드림허브군산FS", "/crests/gunsan.png"],
    ["군산FS", "/crests/gunsan.png"],
    ["청주팔라시오FS", "/crests/cheongju.png"],
    ["청주풋살클럽", "/crests/cheongju.png"],
  ];
  for (const [name, file] of cases) assert.equal(crestFor(name), file, name);
});

test("crestFor: 못 구한 팀, 모르는 팀, 빈 이름은 null", () => {
  assert.equal(crestFor("인천ZD스포츠"), "/crests/incheon-zd.png");
  assert.equal(crestFor("인천ZD"), "/crests/incheon-zd.png");
  // 제천FS: 소유자 지정 원형 엠블럼 (2026-11-15, I-051)
  assert.equal(crestFor("제천FS"), "/crests/jecheon.png");
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
      // 소유자가 직접 준 원본은 받은 크기 그대로(200 이상) — 그 밖은 긴 변 256 이상
      const ownerGiven = e.source?.startsWith("소유자 제공") ?? false;
      assert.ok(Math.max(...(e.pixels ?? [0])) >= (ownerGiven ? 200 : 256), e.file);
      if (e.fileOnLight) {
        const light = readFileSync(new URL(`../public${e.fileOnLight}`, import.meta.url));
        assert.deepEqual([light.readUInt32BE(16), light.readUInt32BE(20)], e.pixels, e.fileOnLight);
      }
      assert.ok((e.source?.startsWith("https://") || ownerGiven) && /^\d{4}-\d{2}-\d{2}$/.test(e.fetchedAt ?? ""), e.name);
    } else {
      assert.match(e.note, /^못 구함: /, e.name);
      assert.equal(e.pixels, null, e.name);
    }
    assert.ok(!e.note.includes("·"), `${e.name} 중간점`);
  }
});

test("crestImageFor: 경로와 원본 크기, 없으면 null", () => {
  assert.deepEqual(crestImageFor("강원 FS"), { src: "/crests/gangwon.png", width: 256, height: 264 });
  // 흰 글씨 로고: 어두운 면은 흰 파일, 흰 면은 검정 파일 (소유자 2026-11-12)
  assert.equal(crestImageFor("인천ZD스포츠")?.src, "/crests/incheon-zd.png");
  assert.equal(crestImageFor("인천ZD스포츠", "light")?.src, "/crests/incheon-zd-on-light.png");
  assert.equal(crestImageFor("화성FS", "light")?.src, "/crests/hwaseong.png");
  assert.deepEqual(crestImageFor("경기LBFS"), { src: "/crests/lbfs.png", width: 233, height: 281 });
});

// ── D-094 DB 줄이 코드 목록을 덮는다 ──
import { mergeCrests } from "../src/lib/crests.ts";
import { toTeamCrest } from "../src/lib/data/rows.ts";
import type { TeamCrestEntry } from "../src/config/team-crests.ts";

const codeEntry = (over: Partial<TeamCrestEntry> = {}): TeamCrestEntry => ({
  name: "용인지솔FS",
  aliases: ["용인대흥FS"],
  file: "/crests/yongin.png",
  pixels: [256, 256],
  source: "code",
  fetchedAt: "2026-11-10",
  note: "코드",
  ...over,
});

test("mergeCrests: 별칭이 겹치면 같은 팀 — DB 파일과 크기가 덮고 별칭은 합친다", () => {
  const db = toTeamCrest({ name: "용인FS", aliases: ["용인대흥FS"], file_url: "https://x/storage/v1/object/public/media/crests/a.png", file_on_light_url: null, width: 500, height: 400, source: "구단", note: "", updated_at: "2026-11-14T00:00:00Z" });
  const [m] = mergeCrests([codeEntry()], [db]);
  assert.equal(m.name, "용인FS");
  assert.equal(m.file, "https://x/storage/v1/object/public/media/crests/a.png");
  assert.deepEqual(m.pixels, [500, 400]);
  assert.ok(m.aliases.includes("용인지솔FS") && m.aliases.includes("용인대흥FS"));
  assert.equal(m.fetchedAt, "2026-11-14");
  assert.equal(crestImageFor("용인지솔FS", "dark", mergeCrests([codeEntry()], [db]))?.src, "https://x/storage/v1/object/public/media/crests/a.png");
});

test("mergeCrests: 파일을 비운 DB 줄은 코드 파일 그대로(기본값), 새 팀은 붙인다, 흰 면 파일", () => {
  const empty = toTeamCrest({ name: "용인지솔FS", aliases: [], file_url: null, file_on_light_url: null, width: null, height: null, source: null, note: null, updated_at: null });
  assert.equal(mergeCrests([codeEntry()], [empty])[0].file, "/crests/yongin.png");
  const fresh = toTeamCrest({ name: "제천FS", aliases: [], file_url: "https://x/d.png", file_on_light_url: "https://x/l.png", width: 10, height: 12, source: null, note: null, updated_at: null });
  const list = mergeCrests([codeEntry()], [fresh]);
  assert.equal(list.length, 2);
  assert.equal(crestImageFor("제천 FS", "light", list)?.src, "https://x/l.png");
  assert.equal(crestImageFor("제천FS", "dark", list)?.src, "https://x/d.png");
  // DB 가 비면(마이그레이션 전) 코드 목록 그대로
  assert.deepEqual(mergeCrests([codeEntry()], []), [codeEntry()]);
});
