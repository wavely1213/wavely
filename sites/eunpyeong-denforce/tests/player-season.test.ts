// 선수 기록 시즌 + 기록 줄 안A (명세 1.6, 3.1, D-098) — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveStatsSeason, seasonRecord, withSeasonStats } from "../src/lib/player-season.ts";
import type { GkSeasonStat, KflLeague, Player, PlayerSeasonStat } from "../src/types/index.ts";

const COMP = "키움증권 2026-27 FK리그1";
const L2627: KflLeague = { leagueSeq: 116, season: "2026-27", competition: COMP, active: true, statsLive: true };
const player = (over: Partial<Player> = {}): Player => ({
  id: "p1",
  slug: "no-7",
  number: 7,
  name: "김영록",
  position: "PIVO",
  photo: null,
  birth: null,
  heightCm: null,
  stats: { apps: 11, goals: 7, assists: 2 },
  ...over,
});
const row = (over: Partial<PlayerSeasonStat> = {}): PlayerSeasonStat => ({ competition: COMP, season: "2026-27", playerId: "p1", apps: 12, starts: 9, goals: 10, yellows: 2, reds: 0, ...over });

test("resolveStatsSeason: 공개가 켜진 활성 리그만, 없으면 고정 칸 시즌", () => {
  assert.deepEqual(resolveStatsSeason([], "2025-26 FK1리그", "FK1리그"), { label: "2025-26 FK1리그", league: null });
  assert.deepEqual(resolveStatsSeason([{ ...L2627, statsLive: false }], "2025-26 FK1리그", "FK1리그"), { label: "2025-26 FK1리그", league: null });
  assert.deepEqual(resolveStatsSeason([{ ...L2627, active: false }], "2025-26 FK1리그", "FK1리그"), { label: "2025-26 FK1리그", league: null });
  const later = { ...L2627, leagueSeq: 130, season: "2027-28", competition: "x" };
  assert.deepEqual(resolveStatsSeason([L2627, later], "f", "FK1리그"), { label: "2027-28 FK1리그", league: later });
  assert.deepEqual(resolveStatsSeason([L2627], "f", "FK1리그"), { label: "2026-27 FK1리그", league: L2627 });
});

test("withSeasonStats: 꺼짐이면 그대로, 켜짐이면 기록지 값(도움 0), 줄 없으면 0", () => {
  const p = player();
  assert.equal(withSeasonStats(p, { label: "2025-26 FK1리그", league: null }, [row()]), p);
  const s = { label: "2026-27 FK1리그", league: L2627 };
  assert.deepEqual(withSeasonStats(p, s, [row()]).stats, { apps: 12, goals: 10, assists: 0 });
  assert.deepEqual(withSeasonStats(p, s, [row({ competition: "다른 대회" })]).stats, { apps: 0, goals: 0, assists: 0 });
});

test("seasonRecord: 안A 필드 선수 (피그마 302:29944 문구)", () => {
  const r = seasonRecord({ player: player(), season: { label: "2026-27 FK1리그", league: L2627 }, rows: [row()], gk: [], sourceName: "한국풋살연맹" });
  assert.deepEqual(r, {
    kind: "played",
    big: "12경기 / 10골",
    small: [
      { label: "선발", value: 9 },
      { label: "경고", value: 2, card: "yellow" },
      { label: "퇴장", value: 0, card: "red" },
    ],
    source: "출장/선발/득점/경고/퇴장: 2026-27 FK1리그 기록지 / 자료: 한국풋살연맹",
  });
});

test("seasonRecord: 안A 골레이로 — 실점은 구단 입력, 없으면 '-' (피그마 302:30043 문구)", () => {
  const gkPlayer = player({ id: "g1", position: "GK" });
  const rows = [row({ playerId: "g1", apps: 12, starts: 12, goals: 0, yellows: 1 })];
  const gk: GkSeasonStat[] = [{ competition: COMP, playerId: "g1", games: 12, conceded: 18 }];
  const season = { label: "2026-27 FK1리그", league: L2627 };
  const r = seasonRecord({ player: gkPlayer, season, rows, gk, sourceName: "한국풋살연맹" });
  assert.deepEqual(r, {
    kind: "played",
    big: "12경기 / 실점 18",
    small: [
      { label: "선발", value: 12 },
      { label: "득점", value: 0 },
      { label: "경고", value: 1, card: "yellow" },
      { label: "퇴장", value: 0, card: "red" },
    ],
    source: "출장/선발/득점/경고/퇴장: 2026-27 FK1리그 기록지 / 자료: 한국풋살연맹 / 실점: 구단 입력",
  });
  const none = seasonRecord({ player: gkPlayer, season, rows, gk: [], sourceName: "한국풋살연맹" });
  assert.equal(none.big, "12경기 / 실점 -");
});

test("seasonRecord: 0경기 + 안내 줄 (피그마 302:30078)", () => {
  const r = seasonRecord({ player: player(), season: { label: "2026-27 FK1리그", league: L2627 }, rows: [], gk: [], sourceName: "한국풋살연맹" });
  assert.deepEqual(r, { kind: "none", big: "0경기", guide: "2026-27 시즌 출장 기록이 아직 없습니다" });
});

test("문구에 중간점 없음", () => {
  const all = [
    seasonRecord({ player: player(), season: { label: "2026-27 FK1리그", league: L2627 }, rows: [row()], gk: [], sourceName: "한국풋살연맹" }),
    seasonRecord({ player: player({ position: "GK" }), season: { label: "2026-27 FK1리그", league: L2627 }, rows: [row()], gk: [], sourceName: "한국풋살연맹" }),
    seasonRecord({ player: player(), season: { label: "2026-27 FK1리그", league: L2627 }, rows: [], gk: [], sourceName: "한국풋살연맹" }),
  ];
  assert.ok(!JSON.stringify(all).includes("·"));
});
