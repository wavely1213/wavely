import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { KflShapeError } from "../supabase/functions/kfl-sync/html.ts";
import { parseClubRoster, parseSchedulePage, type KflListGame } from "../supabase/functions/kfl-sync/schedule.ts";

// 연맹 일정표(tab03) 116 다섯 쪽, 구단 페이지 명단 (D-082, 명세 2.2). 고정 자료 tests/fixtures/kfl/ (축약본)

const fx = (n: string) => readFileSync(`tests/fixtures/kfl/${n}.html`, "utf8");
const pages = [1, 2, 3, 4, 5].map((p) => parseSchedulePage(fx(`tab03_116_p${p}`), p));
const games: KflListGame[] = pages.flatMap((p) => p.games);

test("116 다섯 쪽 → 45경기, 쪽마다 10줄(마지막 5), 마지막 쪽에서 다음 쪽 없음", () => {
  assert.equal(games.length, 45);
  assert.deepEqual(pages.map((p) => p.games.length), [10, 10, 10, 10, 5]);
  assert.deepEqual(pages.map((p) => p.hasNext), [true, true, true, true, false]);
  assert.deepEqual([...new Set(games.map((g) => g.gameNumber))].sort((a, b) => a - b), Array.from({ length: 45 }, (_, i) => i + 1));
});

test("우리 15경기 (eunpyeongfs)", () => {
  const ours = games.filter((g) => g.homeClub === "eunpyeongfs" || g.awayClub === "eunpyeongfs").map((g) => g.gameNumber).sort((a, b) => a - b);
  assert.deepEqual(ours, [1, 5, 9, 10, 13, 16, 20, 24, 27, 28, 32, 34, 39, 42, 43]);
});

test("1번 경기: 시각 +09:00, 대진 이름, 장소, 앵커 빈칸 = 결과 없음, club id 대소문자 그대로", () => {
  const g1 = games.find((g) => g.gameNumber === 1)!;
  assert.deepEqual(g1, {
    gameNumber: 1,
    kickoff: "2026-11-15T14:00:00+09:00",
    venue: "파주NFC",
    homeClub: "fsseoul",
    awayClub: "eunpyeongfs",
    homeName: "노원제너FS",
    awayName: "서울은평덴포스",
    leagueSeq: 116,
    leagueType: 10,
    score: null,
    page: 1,
  });
  assert.ok(games.some((g) => g.homeClub === "GoyangBulls" || g.awayClub === "GoyangBulls"), "대문자 club id 유지");
  assert.ok(games.every((g) => g.score === null), "2026-11-14 받은 116 은 아직 결과 없음");
});

test("날짜순 쪽: 9번(3R, 연기)이 2쪽에 있다", () => {
  assert.equal(games.find((g) => g.gameNumber === 9)?.page, 2);
});

test("앵커 스코어 '2 : 5' 읽기 (2025-26 줄 모양)", () => {
  const row = `<div class="tabScroll"><table class="table_type3 wp100"><tr><th>경기번호</th><th>경기일정</th><th>경기 대진표</th><th>경기장소</th><th>결과</th></tr>
<tr><td>1 </td><td>2025-11-15 15:00</td><td><table><tr><td>서울은평덴포스</td><td>vs</td><td>강원FS</td></tr></table></td><td>서울은평 다목적체육관</td>
<td class="red"><a href="javascript:getrecord('eunpyeongfs','gwFSclub','108','10','1')" class="red"> 2 : 5 </a></td></tr></table></div>`;
  const [g] = parseSchedulePage(row, 1).games;
  assert.deepEqual(g.score, [2, 5]);
  assert.equal(g.leagueSeq, 108);
});

test("모양이 다르면 KflShapeError (일정 표 없음, club id 모양, 링크 번호 다름)", () => {
  assert.throws(() => parseSchedulePage("<html></html>", 1), KflShapeError);
  const bad = (link: string) =>
    `<table class="table_type3"><tr><th>경기번호</th></tr><tr><td>3</td><td>2026-11-15 14:00</td><td><table><tr><td>a</td><td>vs</td><td>b</td></tr></table></td><td>x</td><td><a href="javascript:getrecord(${link})"></a></td></tr></table>`;
  assert.throws(() => parseSchedulePage(bad(`'a b','c','116','10','3'`), 1), KflShapeError);
  assert.throws(() => parseSchedulePage(bad(`'aa','cc','116','10','4'`), 1), KflShapeError);
});

test("구단 페이지 명단: 세 칸씩, 이름 공백 제거, 배번 숫자", () => {
  const roster = parseClubRoster(fx("eunpyeong"));
  assert.ok(roster.length >= 20);
  assert.deepEqual(roster[0], { no: 1, name: "박종현", position: "GOLEIRO" });
  assert.ok(roster.every((r) => Number.isInteger(r.no) && !/\s/.test(r.name)));
  assert.throws(() => parseClubRoster("<table><tr><th>x</th></tr></table>"), KflShapeError);
});
