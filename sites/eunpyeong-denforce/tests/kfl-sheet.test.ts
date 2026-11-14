import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { applySubset, checkSheet, isFinished, KflShapeError, parseSheet, type KflSheet, type SheetCheckContext } from "../supabase/functions/kfl-sync/sheet.ts";

// 연맹 결과기록지 (D-082, 명세 2.2). 고정 자료: 축약 기록지 7장 = sheets.expected.json (이름 칸은 비운 정답)

const fx = (n: string) => readFileSync(`tests/fixtures/kfl/${n}.html`, "utf8");
const expected = JSON.parse(readFileSync("tests/fixtures/kfl/sheets.expected.json", "utf8")) as Record<string, KflSheet>;
const anon = (s: KflSheet): KflSheet => ({
  ...s,
  home: { ...s.home, players: s.home.players.map((p) => ({ ...p, name: "" })) },
  away: { ...s.away, players: s.away.players.map((p) => ({ ...p, name: "" })) },
});
const sheet = (n: string) => parseSheet(fx(n));

test("축약 기록지 7장 = 정답", () => {
  for (const n of Object.keys(expected)) assert.deepEqual(anon(sheet(n)), expected[n], n);
  assert.equal(Object.keys(expected).length, 7);
});

test("머리, 합계, 전후반, 팀 이름 (108 #1 서울은평덴포스 2 : 5 강원FS)", () => {
  const s = sheet("rec108_g1");
  assert.equal(s.title, "flex 2025-26 FK 리그(FK1) (일반(남))");
  assert.deepEqual([s.gameNumber, s.date, s.time], [1, "2025-11-15", "15:00"]);
  assert.deepEqual([s.home.fedName, s.home.total, s.away.fedName, s.away.total], ["서울은평덴포스", 2, "강원FS", 5]);
  assert.deepEqual(s.periods, { first: [1, 4], second: [1, 1], extra: null, pk: null });
  assert.equal(s.home.players.length, 14);
  // 강원FS 쪽 P 표시 0개 (2025-26 #1 실제 사례)
  assert.equal(s.away.players.filter((p) => p.starter).length, 0);
  // 우리 #77: 4번 칸(1경고) 15분, 골 칸 36분 — 칸 위치로 경고와 골을 나눈다
  const p77 = s.home.players.find((p) => p.no === 77)!;
  assert.deepEqual([p77.yellows, p77.goals, p77.bench], [[15], [36], true]);
});

test("자책골은 자기 팀 표의 골 칸 글자 — 상대 득점 (23, 25, 40)", () => {
  assert.deepEqual(sheet("rec108_g23").home.players.find((p) => p.no === 7)?.ownGoals, [15]);
  assert.deepEqual(sheet("rec108_g25").away.players.find((p) => p.no === 3)?.ownGoals, [8]);
  assert.deepEqual(sheet("rec108_g40").away.players.find((p) => p.no === 8)?.ownGoals, [19]);
});

test("숫자 없는 'og' 는 null 분 (합성 사례)", () => {
  const html = fx("rec108_g23").replace(/>15\(og</, ">og<");
  assert.deepEqual(parseSheet(html).home.players.find((p) => p.no === 7)?.ownGoals, [null]);
});

test("두 번째 경고: 2경고와 퇴장 칸에 같은 분 — 그대로 (25, 5번 14 / 25 / 25)", () => {
  const p5 = sheet("rec108_g25").away.players.find((p) => p.no === 5)!;
  assert.deepEqual([p5.yellows, p5.reds], [[14, 25], [25]]);
});

test("몰수(28): 선수 줄 0 + 비고 '몰수' → forfeit, 점수는 합계 0 : 3", () => {
  const s = sheet("rec108_g28");
  assert.deepEqual([s.forfeit, s.hasPlayers, s.home.total, s.away.total], [true, false, 0, 3]);
  assert.match(s.home.remark + s.away.remark, /몰수/);
});

test("club id 없이 받은 기록지(43_min) → 선수 표 없음, 미진행(116_g1) → 끝나지 않음", () => {
  const min = sheet("rec108_g43_min");
  assert.deepEqual([min.hasPlayers, min.forfeit, min.home.total, min.away.total], [false, false, 7, 5]);
  const u = sheet("rec116_g1");
  assert.deepEqual([u.hasPlayers, u.home.total, u.away.total, u.gameNumber], [false, 0, 0, 1]);
  assert.equal(isFinished({ score: null }, u), false);
  assert.equal(isFinished({ score: [0, 0] }, u), false, "스코어가 있어도 선수 줄 없고 몰수 아니면 끝나지 않음");
  assert.equal(isFinished({ score: [2, 5] }, sheet("rec108_g1")), true);
  assert.equal(isFinished({ score: [0, 3] }, sheet("rec108_g28")), true);
});

test("잘린 HTML, 칸 수 다른 선수 줄은 KflShapeError (일부만 반영하지 않는다)", () => {
  const html = fx("rec108_g1");
  assert.throws(() => parseSheet(html.slice(0, html.indexOf('width="499"'))), KflShapeError);
  assert.throws(() => parseSheet(html.replace(/<span class="record_20">2<\/span>/, "")), KflShapeError);
  const shortRow = html.replace(/(<td class="record_text_bg2">13<\/td>\s*<td colspan="3" class="record_text_bg2">[^<]*<\/td>)\s*<td class="record_text_bg2">O<\/td>/, "$1");
  assert.throws(() => parseSheet(shortRow), KflShapeError);
});

// ── 검산 14개 ──
const ctx = (over: Partial<SheetCheckContext> = {}): SheetCheckContext => ({
  gameNumber: 1,
  season: "2025-26",
  ourFedName: "서울은평덴포스",
  opponentFedName: "강원FS",
  listScore: [2, 5],
  us: "home",
  ...over,
});
const g1 = () => structuredClone(sheet("rec108_g1"));

test("검산: 실제 기록지는 통과 (P 0개는 상대라 메모 없음)", () => {
  assert.deepEqual(checkSheet(g1(), ctx()), { failures: [], notes: [] });
  assert.deepEqual(checkSheet(sheet("rec108_g28"), ctx({ gameNumber: 28, us: "away", opponentFedName: null, listScore: [0, 3] })).failures, []);
});

test("검산 실패 규칙 1~3, 5~10", () => {
  const f = (s: KflSheet, c = ctx()) => checkSheet(s, c).failures;
  assert.match(f(g1(), ctx({ gameNumber: 2 })).join(), /경기번호/); // 1
  assert.match(f(g1(), ctx({ season: "2026-27" })).join(), /대회명/); // 2
  assert.match(f(g1(), ctx({ ourFedName: "다른팀" })).join(), /우리 팀 이름/); // 3
  const s5 = g1();
  s5.home.total = 3;
  assert.match(f(s5).join(), /골 수/); // 5
  const s6 = g1();
  s6.periods.second = [2, 1];
  assert.match(f(s6).join(), /전후반/); // 6
  assert.match(f(g1(), ctx({ listScore: [2, 4] })).join(), /일정표/); // 7
  const s8 = g1();
  s8.home.players = s8.home.players.slice(0, 4);
  assert.match(f(s8).join(), /5명/); // 8
  const s9 = g1();
  s9.home.players[1].no = s9.home.players[0].no;
  assert.match(f(s9).join(), /겹침/); // 9
  const s10 = g1();
  Object.assign(s10.home.players[0], { starter: false, bench: false, yellows: [3] });
  assert.match(f(s10).join(), /P\/S 없는 줄/); // 10
});

test("검산 메모 규칙 4, 11~14 (반영은 하되 review)", () => {
  const n = (s: KflSheet, c = ctx()) => checkSheet(s, c).notes;
  assert.match(n(g1(), ctx({ opponentFedName: "강원 풋살클럽" })).join(), /상대 팀 이름/); // 4
  const s11 = g1();
  s11.home.players.forEach((p) => (p.starter = false));
  s11.home.players.forEach((p) => (p.bench = true));
  assert.match(n(s11).join(), /선발\(P\)/); // 11
  const s12 = g1();
  s12.home.players.find((p) => p.no === 77)!.goals = [36, 44];
  assert.match(n(s12).join(), /연장 분/); // 12
  const s13 = g1();
  s13.periods.pk = [4, 3];
  assert.match(n(s13).join(), /승부차기/); // 13
  const s14 = g1();
  s14.home.players.find((p) => p.no === 77)!.goals = [null];
  assert.match(n(s14).join(), /분을 읽지 못한/); // 14
});

test("applySubset: 심판, 관중, 파울, 지도자, 비고, 상대 선수 줄이 바뀌어도 같고, 우리 줄이 바뀌면 다르다", () => {
  const base = applySubset(sheet("rec108_g1"), "home");
  const noisy = fx("rec108_g1")
    .replace(/(<td class="record_title_bg">관중수<\/td>\s*<td class="record_text_bg">)\d*/, "$1999")
    .replace(/(<td class="record_title_bg">주심<\/td>\s*<td class="record_text_bg">)/, "$1새심판")
    .replace(/(<td colspan="21"[^>]*>)/, "$1T.O 3분");
  assert.equal(applySubset(parseSheet(noisy), "home"), base);
  const s = sheet("rec108_g1");
  s.away.players[0].yellows = [9];
  assert.equal(applySubset(s, "home"), base, "상대 선수 줄은 해시 밖");
  const t = sheet("rec108_g1");
  t.home.players[0].yellows = [9];
  assert.notEqual(applySubset(t, "home"), base);
  assert.deepEqual(Object.keys(JSON.parse(base)).sort(), ["forfeit", "opponentOwnGoals", "periods", "total", "us"]);
});
