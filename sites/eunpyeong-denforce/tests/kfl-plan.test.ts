// 연맹 기록 수집 계획 (D-082, 명세 5.2)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  diffClubRoster,
  kickoffChangeNote,
  linkMatch,
  matchPlayers,
  nextCheckAt,
  NOTE,
  planResult,
  planStandings,
  scorersText,
  standingsFromGames,
  type Appearance,
  type PlayerLite,
  type SiteMatch,
} from "../supabase/functions/kfl-sync/plan.ts";
import { applySubset, checkSheet, parseSheet, type KflSheet, type SheetPlayer } from "../supabase/functions/kfl-sync/sheet.ts";

const FIX = new URL("./fixtures/kfl/", import.meta.url);
const json = <T>(f: string): T => JSON.parse(readFileSync(new URL(f, FIX), "utf8")) as T;
const html = (f: string) => readFileSync(new URL(f, FIX), "utf8");

const sp = (no: number, over: Partial<SheetPlayer> = {}): SheetPlayer => ({ no, name: "", starter: true, bench: false, yellows: [], reds: [], goals: [], ownGoals: [], ...over });
const pl = (id: string, name: string, slug = id): PlayerLite => ({ id, name, slug });

// 동명이인 4줄 (2026-11-13_roster_drive.sql)
const KIM6 = pl("kim6", "김대현", "no-8");
const KIM18 = pl("kim18", "김대현", "no-18");
const JONG22 = pl("jong22", "김종호", "no-22");
const JONG30 = pl("jong30", "김종호", "kim-jongho");
const KANG = pl("kang", "강민원", "kang-minwon");
const PLAYERS = [KIM6, KIM18, JONG22, JONG30, KANG];
const NUMBERS = new Map<number, PlayerLite>([
  [6, KIM6],
  [18, KIM18],
  [22, JONG22],
  [30, JONG30],
  [5, KANG],
]);

test("matchPlayers 4: 번호표 + 이름 빈칸/같음 → auto, 동명이인은 번호로만 갈림", () => {
  const r = matchPlayers({ sheetPlayers: [sp(6), sp(18, { name: "김대현" }), sp(22), sp(30, { name: "김 종호" })], live: true, numbers: NUMBERS, players: PLAYERS, previous: [], correction: false });
  assert.deepEqual(
    r.rows.map((x) => [x.shirtNumber, x.link, x.playerId]),
    [
      [6, "auto", "kim6"],
      [18, "auto", "kim18"],
      [22, "auto", "jong22"],
      [30, "auto", "jong30"],
    ],
  );
});

test("matchPlayers 5/6/7: 이름 다름, 번호표에 없음(같은 이름 1명 / 그 밖)", () => {
  const r = matchPlayers({
    sheetPlayers: [sp(5, { name: "홍길동" }), sp(77, { name: "강민원" }), sp(78, { name: "김대현" }), sp(79)],
    live: true,
    numbers: NUMBERS,
    players: PLAYERS,
    previous: [],
    correction: false,
  });
  const [a, b, c, d] = r.rows;
  assert.deepEqual([a.link, a.playerId, a.suggestedPlayerId, a.note], ["review", null, "kang", "기록지 5번 '홍길동', 번호표 '강민원'"]);
  assert.deepEqual([b.link, b.suggestedPlayerId, b.note], ["review", "kang", NOTE.rowNotInNumbers]);
  // 김대현은 둘 → 이름만으로 제안하지 않는다
  assert.deepEqual([c.link, c.suggestedPlayerId, c.note], ["review", null, NOTE.rowNotInNumbers]);
  assert.deepEqual([d.link, d.suggestedPlayerId], ["review", null]);
});

test("matchPlayers 2: live=false → 모든 줄 review + 제안(번호표, 없으면 이름 1명)", () => {
  const r = matchPlayers({ sheetPlayers: [sp(6), sp(77, { name: "강민원" }), sp(79)], live: false, numbers: NUMBERS, players: PLAYERS, previous: [], correction: false });
  assert.ok(r.rows.every((x) => x.link === "review" && x.playerId === null && x.note === NOTE.rowBeforeLive));
  assert.deepEqual(
    r.rows.map((x) => x.suggestedPlayerId),
    ["kim6", "kang", null],
  );
});

const prevRow = (no: number, over: Partial<Appearance> = {}): Appearance => ({
  shirtNumber: no,
  sheetName: "",
  link: "auto",
  playerId: null,
  suggestedPlayerId: null,
  started: true,
  bench: false,
  yellowMinutes: [],
  redMinutes: [],
  goalMinutes: [],
  ownGoalMinutes: [],
  note: null,
  ...over,
});

test("matchPlayers 1: 기존 줄은 번호표가 바뀌어도 유지, 기록 값은 새 기록지", () => {
  const changed = new Map(NUMBERS);
  changed.set(6, KANG); // 시즌 중 번호표 변경
  const r = matchPlayers({
    sheetPlayers: [sp(6, { goals: [12] }), sp(18, { name: "김대현" })],
    live: true,
    numbers: changed,
    players: PLAYERS,
    previous: [prevRow(6, { playerId: "kim6" }), prevRow(18, { link: "confirmed", playerId: "kim18" })],
    correction: true,
  });
  assert.deepEqual(
    r.rows.map((x) => [x.shirtNumber, x.link, x.playerId, x.goalMinutes]),
    [
      [6, "auto", "kim6", [12]],
      // 이전 이름 빈칸 + 새 이름 = 연결 선수 이름 → 유지
      [18, "confirmed", "kim18", []],
    ],
  );
});

test("matchPlayers 3: 정정으로 새로 생긴 줄 → review, 사라진 줄 → 메모", () => {
  const r = matchPlayers({
    sheetPlayers: [sp(6), sp(22)],
    live: true,
    numbers: NUMBERS,
    players: PLAYERS,
    previous: [prevRow(6, { playerId: "kim6" }), prevRow(30, { playerId: "jong30" }), prevRow(9, { link: "review" })],
    correction: true,
  });
  assert.deepEqual([r.rows[1].link, r.rows[1].suggestedPlayerId, r.rows[1].note], ["review", "jong22", NOTE.rowCorrection]);
  assert.deepEqual(r.removed, [30, 9]);
  assert.deepEqual(r.notes, ["30번 줄이 기록지에서 사라짐(이전: 김종호)", "9번 줄이 기록지에서 사라짐(이전: 확인 필요)"]);
});

test("matchPlayers 8: 두 줄이 같은 선수 → 둘 다 review, P/S 없는 줄은 저장 안 함", () => {
  const nums = new Map(NUMBERS);
  nums.set(7, KANG);
  const r = matchPlayers({ sheetPlayers: [sp(5), sp(7), sp(9, { starter: false })], live: true, numbers: nums, players: PLAYERS, previous: [], correction: false });
  assert.equal(r.rows.length, 2);
  assert.ok(r.rows.every((x) => x.link === "review" && x.playerId === null && x.suggestedPlayerId === "kang" && x.note === NOTE.rowTwice));
});

test("scorersText: 한 골 숫자 없음, 동명이인 번호, 분 순서, 상대 자책골, 300자, 빈 결과 null", () => {
  const rows = [
    { shirtNumber: 18, playerId: "kim18", goalMinutes: [30] },
    { shirtNumber: 6, playerId: "kim6", goalMinutes: [5, 20] },
    { shirtNumber: 5, playerId: "kang", goalMinutes: [null] },
    { shirtNumber: 22, playerId: "jong22", goalMinutes: [] },
  ];
  assert.equal(scorersText(rows, 2, PLAYERS), "김대현(6) 2, 김대현(18), 강민원, 상대 자책골 2");
  assert.equal(scorersText(rows.slice(2, 3), 1, PLAYERS), "강민원, 상대 자책골");
  assert.equal(scorersText([], 0, PLAYERS), null);
  const many = Array.from({ length: 60 }, (_, i) => ({ shirtNumber: i, playerId: `p${i}`, goalMinutes: [i] }));
  const text = scorersText(many, 0, many.map((m) => pl(m.playerId, `선수이름${m.shirtNumber}`)));
  assert.ok(text && text.length <= 300);
});

/* 2025-26 합계 재현 (2025-26_kfl.sql + 운영 보충값 2026-11-13_roster_drive.sql:49-50) */
type OurGame = { gameNumber: number; us: "home" | "away"; total: [number, number]; forfeit: boolean; players: Array<Omit<SheetPlayer, "name">> };

test("2025-26 우리 15경기 → 선수별 출전/골이 기존 기록과 같음", () => {
  const games = json<OurGame[]>("our-2025-26.json");
  assert.equal(games.length, 15);
  const nos = new Set(games.flatMap((g) => g.players.map((p) => p.no)));
  const numbers = new Map([...nos].map((n) => [n, pl(`no${n}`, `선수${n}`)]));
  const players = [...numbers.values()];
  const apps = new Map<number, number>();
  const goals = new Map<number, number>();
  for (const g of games) {
    if (g.forfeit) continue; // 몰수: 연맹 기준 출전 기록 없음
    const r = matchPlayers({ sheetPlayers: g.players.map((p) => ({ ...p, name: "" })), live: true, numbers, players, previous: [], correction: false });
    assert.ok(r.rows.every((x) => x.link === "auto"));
    for (const x of r.rows) {
      apps.set(x.shirtNumber, (apps.get(x.shirtNumber) ?? 0) + 1);
      goals.set(x.shirtNumber, (goals.get(x.shirtNumber) ?? 0) + x.goalMinutes.length);
    }
  }
  const expected: Record<number, [number, number]> = { 5: [13, 0], 7: [13, 1], 8: [9, 1], 18: [12, 1], 21: [2, 1], 25: [7, 0], 77: [12, 10], 3: [8, 4], 11: [13, 3], 23: [14, 0] };
  for (const [no, [a, gl]] of Object.entries(expected)) assert.deepEqual([apps.get(Number(no)), goals.get(Number(no))], [a, gl], `#${no}`);
});

/* 순위 재현 */
type ListGame = { gameNumber: number; homeClub: string; awayClub: string; homeName: string; awayName: string; score: [number, number] | null; kickoff: string };
const SITE_NAME: Record<string, string> = { 서울은평덴포스: "서울은평 덴포스" };

test("standingsFromGames: 108 일정표 스코어 → 2025-26_kfl.sql 순위와 같음 (우리 2/3/10 34:89)", () => {
  const games = json<ListGame[]>("games-108.json");
  const clubNames = new Map<string, string>();
  for (const g of games) {
    clubNames.set(g.homeClub.toLowerCase(), SITE_NAME[g.homeName] ?? g.homeName);
    clubNames.set(g.awayClub.toLowerCase(), SITE_NAME[g.awayName] ?? g.awayName);
  }
  const { records, unknown } = standingsFromGames(games, clubNames);
  assert.deepEqual(unknown, []);
  const table = Object.fromEntries([...records].map(([t, r]) => [t, [r.win, r.draw, r.loss, r.goalsFor, r.goalsAgainst]]));
  assert.deepEqual(table, {
    경기LBFS: [10, 2, 3, 83, 24],
    노원제너FS: [10, 2, 3, 60, 34],
    고양불스풋살클럽: [8, 4, 3, 68, 44],
    강원FS: [5, 4, 6, 45, 53],
    "서울은평 덴포스": [2, 3, 10, 34, 89],
    전주시민풋살구단: [2, 1, 12, 36, 82],
  });
});

test("planStandings: 다른 행만, 팀 이름이 안 맞으면 아무것도 안 씀", () => {
  const records = new Map([
    ["A", { win: 1, draw: 0, loss: 0, goalsFor: 3, goalsAgainst: 1 }],
    ["B", { win: 0, draw: 0, loss: 1, goalsFor: 1, goalsAgainst: 3 }],
  ]);
  const rows = [
    { id: "a", team: "A", win: 1, draw: 0, loss: 0, goalsFor: 3, goalsAgainst: 1 },
    { id: "b", team: "B", win: 0, draw: 0, loss: 0, goalsFor: 0, goalsAgainst: 0 },
  ];
  assert.deepEqual(planStandings(records, [], rows), { updates: [{ id: "b", win: 0, draw: 0, loss: 1, goalsFor: 1, goalsAgainst: 3 }], warning: null });
  const bad = planStandings(records, [], rows.slice(0, 1));
  assert.deepEqual(bad.updates, []);
  assert.match(bad.warning ?? "", /'B' 행 없음/);
  assert.match(planStandings(records, ["zzz"], rows).warning ?? "", /zzz/);
});

/* 경기 연결 */
const CLUBS = new Map([
  ["eunpyeongfs", "서울은평 덴포스"],
  ["fsseoul", "노원제너FS"],
]);
const COMP = "키움증권 2026-27 FK리그1";
const siteMatch = (id: string, kickoff: string, over: Partial<SiteMatch> = {}): SiteMatch => ({
  id,
  competition: COMP,
  opponent: "노원제너FS",
  kickoff,
  status: "scheduled",
  scoreUs: null,
  scoreThem: null,
  scorers: null,
  ...over,
});

test("linkMatch: 날짜 + 상대, is_home 무시(연맹이 중립 경기장에서 우리를 홈으로 둬도), 0개/여러 개는 메모", () => {
  const game = { kickoff: "2026-11-15T14:00:00+09:00", homeClub: "EunpyeongFS", awayClub: "FSSeoul" };
  // 사이트는 원정(BR-030)이고 시각도 조금 다르지만 같은 KST 날짜
  assert.deepEqual(linkMatch(game, "eunpyeongfs", CLUBS, COMP, [siteMatch("m1", "2026-11-15T05:30:00Z"), siteMatch("m2", "2026-11-22T05:00:00Z")]), { matchId: "m1" });
  // 원정으로 나온 우리
  assert.deepEqual(linkMatch({ ...game, homeClub: "fsseoul", awayClub: "eunpyeongfs" }, "eunpyeongfs", CLUBS, COMP, [siteMatch("m1", "2026-11-15T05:00:00Z")]), { matchId: "m1" });
  assert.deepEqual(linkMatch(game, "eunpyeongfs", CLUBS, COMP, []), { note: "사이트에 같은 날 이 상대 경기가 없음" });
  assert.deepEqual(linkMatch(game, "eunpyeongfs", CLUBS, COMP, [siteMatch("a", "2026-11-15T01:00:00Z"), siteMatch("b", "2026-11-15T09:00:00Z")]), { note: "같은 날 후보 여러 개" });
  // KST 날짜: UTC 로는 전날
  assert.deepEqual(linkMatch({ ...game, kickoff: "2026-11-15T08:00:00+09:00" }, "eunpyeongfs", CLUBS, COMP, [siteMatch("m1", "2026-11-14T23:30:00Z")]), { matchId: "m1" });
  // 다른 대회는 후보 아님
  assert.ok("note" in linkMatch(game, "eunpyeongfs", CLUBS, COMP, [siteMatch("m1", "2026-11-15T05:00:00Z", { competition: "다른 대회" })]));
});

test("kickoffChangeNote: 연맹 값이 바뀌고 사이트와 1분 넘게 다를 때만", () => {
  const site = "2026-11-15T05:00:00Z";
  assert.equal(kickoffChangeNote("2026-11-15T14:00:00+09:00", "2026-11-15T14:00:00+09:00", site), null);
  assert.equal(kickoffChangeNote(null, "2026-11-15T16:00:00+09:00", site), null); // 첫 저장
  assert.equal(kickoffChangeNote("2026-11-15T13:00:00+09:00", "2026-11-15T14:00:00+09:00", site), null); // 사이트와 같아짐
  assert.equal(kickoffChangeNote("2026-11-15T14:00:00+09:00", "2026-11-15T16:00:00+09:00", site), "연맹 일정 변경: 사이트 2026-11-15 14:00, 연맹 2026-11-15 16:00");
});

/* 결과 반영 계획 */
const sheet108 = (f: string) => parseSheet(html(f));
const ctx = (s: KflSheet, us: "home" | "away") => checkSheet(s, { gameNumber: s.gameNumber ?? 0, season: "2025-26", ourFedName: "서울은평덴포스", opponentFedName: null, listScore: [s.home.total, s.away.total], us });
const usOf = (s: KflSheet) => (s.home.fedName.replace(/\s/g, "") === "서울은평덴포스" ? "home" : "away");
const numbersFor = (s: KflSheet) => new Map(s[usOf(s)].players.map((p) => [p.no, pl(`no${p.no}`, p.name || `선수${p.no}`)]));
const base = (s: KflSheet, over: Partial<Parameters<typeof planResult>[0]> = {}) => {
  const us = usOf(s);
  const numbers = numbersFor(s);
  return {
    game: { matchId: "m", seenHash: null, appliedHash: null, note: null },
    match: siteMatch("m", "2025-11-15T06:00:00Z"),
    sheet: s,
    us,
    hash: applySubset(s, us),
    check: ctx(s, us),
    live: true,
    numbers,
    players: [...numbers.values()],
    previous: [],
    ...over,
  } as Parameters<typeof planResult>[0];
};

test("planResult: 대기 → 반영 (108 #1 2:5), 같은 해시면 할 일 없음", () => {
  const s = sheet108("rec108_g1.html");
  const p = planResult(base(s));
  assert.equal(p.action, "apply");
  if (p.action !== "apply") return;
  assert.deepEqual([p.match.scoreUs, p.match.scoreThem, p.state, p.appearances.remove], [2, 5, "recorded", []]);
  assert.ok(p.appearances.upsert.every((r) => r.link === "auto"));
  assert.equal(typeof p.match.scorers, "string");
  assert.deepEqual(planResult(base(s, { game: { matchId: "m", seenHash: p.seenHash, appliedHash: p.appliedHash, note: null } })), { action: "none", seenHash: p.seenHash });
});

test("planResult: 이미 finished 다른 값 → 덮어씀 + 메모, 상대 자책골, 정정", () => {
  const s = sheet108("rec108_g23.html");
  const p = planResult(base(s, { match: siteMatch("m", "2026-01-01T00:00:00Z", { status: "finished", scoreUs: 9, scoreThem: 9 }), game: { matchId: "m", seenHash: "old", appliedHash: "old", note: null } }));
  assert.equal(p.action, "apply");
  if (p.action !== "apply") return;
  assert.equal(p.state, "review");
  assert.equal(p.notes[0], NOTE.corrected);
  assert.ok(p.notes.some((n) => n.startsWith("기존 9:9 → 연맹 ")));
  // 정정이면 새 줄은 모두 review → 득점자 글은 나중에
  assert.ok(p.appearances.upsert.every((r) => r.link === "review"));
  assert.ok(p.notes.includes(NOTE.scorersLater) || !p.appearances.upsert.some((r) => r.goalMinutes.length));
  assert.equal("scorers" in p.match, !p.appearances.upsert.some((r) => r.goalMinutes.length));
});

test("planResult: 몰수(108 #28) → 스코어만, 출전 기록 없음", () => {
  const s = sheet108("rec108_g28.html");
  const p = planResult(base(s, { previous: [prevRow(5, { playerId: "no5" })] }));
  assert.equal(p.action, "apply");
  if (p.action !== "apply") return;
  assert.deepEqual(p.appearances, { upsert: [], remove: [5] });
  assert.ok(p.notes.includes(NOTE.forfeit));
  assert.equal("scorers" in p.match, false);
});

test("planResult: 득점자는 골 줄이 모두 연결일 때만 (live=false 면 나중에)", () => {
  const s = sheet108("rec108_g1.html");
  const p = planResult(base(s, { live: false }));
  assert.equal(p.action, "apply");
  if (p.action !== "apply") return;
  assert.equal("scorers" in p.match, false);
  assert.ok(p.notes.includes(NOTE.scorersLater));
});

test("planResult: 검산 실패 → hold (같은 값을 다시 보면 none), 연결 없음 → hold", () => {
  const s = sheet108("rec108_g1.html");
  const failing = { failures: ["경기번호가 다름"], notes: [] };
  const h = planResult(base(s, { check: failing }));
  assert.deepEqual(h, { action: "hold", seenHash: h.seenHash, notes: ["검산 실패: 경기번호가 다름"] });
  assert.equal(planResult(base(s, { check: failing, game: { matchId: "m", seenHash: h.seenHash, appliedHash: null, note: null } })).action, "none");
  const nm = planResult(base(s, { match: null }));
  assert.deepEqual(nm.action === "hold" && nm.notes, [NOTE.noMatch]);
});

/* 다음 확인 */
const KICK = "2026-11-15T14:00:00+09:00"; // 05:00Z
const at = (iso: string) => new Date(iso);
const t0 = { kickoff: KICK, appliedHash: null, rechecksLeft: 0, fails: 0, note: null };

test("nextCheckAt 대기: kickoff+2h, 그 뒤 3시간마다, 7일 뒤 하루 1번 + 메모 한 번", () => {
  assert.equal(nextCheckAt(t0, at("2026-11-14T00:00:00Z")).nextCheckAt, "2026-11-15T07:00:00.000Z");
  assert.equal(nextCheckAt(t0, at("2026-11-15T08:00:00Z")).nextCheckAt, "2026-11-15T11:00:00.000Z");
  const late = nextCheckAt(t0, at("2026-11-22T06:00:00Z"));
  assert.deepEqual(late, { nextCheckAt: "2026-11-23T06:00:00.000Z", rechecksLeft: 0, note: NOTE.waiting7d, review: true });
  assert.deepEqual(nextCheckAt({ ...t0, note: NOTE.waiting7d }, at("2026-11-23T06:00:00Z")), { nextCheckAt: "2026-11-24T06:00:00.000Z", rechecksLeft: 0 });
});

test("nextCheckAt 반영 뒤: 24시간마다 7번, 그 뒤 null", () => {
  const now = at("2026-11-15T10:00:00Z");
  assert.deepEqual(nextCheckAt({ ...t0, appliedHash: "h", rechecksLeft: 7 }, now), { nextCheckAt: "2026-11-16T10:00:00.000Z", rechecksLeft: 6 });
  assert.deepEqual(nextCheckAt({ ...t0, appliedHash: "h", rechecksLeft: 0 }, now), { nextCheckAt: null, rechecksLeft: 0 });
});

test("nextCheckAt 오류: 1h × 2^(fails-1), 24h 상한, 5번째에 메모", () => {
  const now = at("2026-11-15T10:00:00Z");
  assert.equal(nextCheckAt({ ...t0, fails: 1 }, now).nextCheckAt, "2026-11-15T11:00:00.000Z");
  assert.equal(nextCheckAt({ ...t0, fails: 3 }, now).nextCheckAt, "2026-11-15T14:00:00.000Z");
  const five = nextCheckAt({ ...t0, fails: 5 }, now);
  assert.deepEqual([five.nextCheckAt, five.note, five.review], ["2026-11-16T02:00:00.000Z", NOTE.fails, true]);
  assert.deepEqual(nextCheckAt({ ...t0, fails: 9, appliedHash: "h", rechecksLeft: 3 }, now), { nextCheckAt: "2026-11-16T10:00:00.000Z", rechecksLeft: 3 });
});

test("diffClubRoster: 연맹에만 / 번호표에만 / 이름 다름 (공백 무시)", () => {
  const d = diffClubRoster(
    [
      { no: 5, name: "강민원", position: "ALA" },
      { no: 9, name: "떠난선수", position: "PIVO" },
      { no: 30, name: "김종호", position: "ALA" },
    ],
    [
      { number: 5, name: "강 민원" },
      { number: 30, name: "김대현" },
      { number: 66, name: "박재희" },
    ],
  );
  assert.deepEqual(d, {
    onlyFed: [{ no: 9, name: "떠난선수", position: "PIVO" }],
    onlyNumbers: [{ number: 66, name: "박재희" }],
    nameDiff: [{ number: 30, fed: "김종호", site: "김대현" }],
  });
});

test("시드 SQL 의 116 대회명 = LEAGUE.currentCompetition", () => {
  const seed = readFileSync(new URL("../supabase/data/2026-11-14_kfl_seed.sql", import.meta.url), "utf8");
  const league = readFileSync(new URL("../src/config/league.ts", import.meta.url), "utf8");
  const current = league.match(/currentCompetition:\s*"([^"]+)"/)?.[1];
  assert.ok(current);
  assert.match(seed, new RegExp(`\\(116, 10, '2026-27', '${current}'`));
});
