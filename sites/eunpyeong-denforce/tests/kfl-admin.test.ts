// 관리자 › 연맹 기록 수집 순수 규칙 + 대시보드 알림 (명세 2.7, 4장, D-098) — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { kflAlerts, type KflSyncStatus } from "../src/lib/admin/alerts.ts";
import {
  canGoLive,
  gkConcededProblem,
  gkDbMessage,
  goalRowsAllLinked,
  kflPlayerLabel,
  kflSheetUrl,
  kflStateLabel,
  scorersText,
} from "../src/lib/admin/kfl.ts";

const NOW = new Date("2026-11-17T06:00:00Z");
const ago = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const okState: NonNullable<KflSyncStatus["state"]> = {
  lastRunAt: ago(0.2),
  lastOkAt: ago(0.2),
  lastError: null,
  lastWarning: null,
  lastListAt: ago(5),
  shapeErrorAt: null,
  pausedUntil: null,
  clubRosterChangedAt: null,
  clubRosterAckAt: null,
};
const base = (over: Partial<KflSyncStatus> = {}): KflSyncStatus => ({ state: okState, games: [], reviewRows: 0, leagues: [{ season: "2026-27", statsLive: true }], now: NOW, ...over });
const titles = (s: KflSyncStatus) => kflAlerts(s).map((a) => `${a.level} ${a.title}`);

test("kflAlerts: 모두 정상이면 알림 없음, 첫 실행 전에도 없음", () => {
  assert.deepEqual(kflAlerts(base()), []);
  assert.deepEqual(kflAlerts(base({ state: null })), []);
  assert.deepEqual(kflAlerts(base({ state: { ...okState, lastRunAt: null, lastOkAt: null, lastListAt: null } })), []);
});

test("kflAlerts: 명세 2.7 표의 조건마다", () => {
  assert.deepEqual(titles(base({ state: { ...okState, lastOkAt: ago(3), lastError: "연맹 응답 500" } })), ["warn 연맹 기록 자동 수집이 2시간 넘게 성공하지 못했습니다"]);
  assert.deepEqual(titles(base({ state: { ...okState, lastListAt: ago(31) } })), ["warn 연맹 일정표를 하루 넘게 읽지 못했습니다"]);
  assert.deepEqual(titles(base({ state: { ...okState, lastListAt: null } })), ["warn 연맹 일정표를 하루 넘게 읽지 못했습니다"]);
  assert.deepEqual(titles(base({ state: { ...okState, shapeErrorAt: ago(1) } })), ["warn 연맹 결과기록지 모양이 바뀐 것 같습니다 (자동 반영 멈춤)"]);
  // 멈춤 시각은 한국 시간
  assert.deepEqual(titles(base({ state: { ...okState, pausedUntil: "2026-11-17T08:30:00Z" } })), ["warn 연맹 요청을 2026-11-17 17:30까지 멈췄습니다"]);
  assert.deepEqual(titles(base({ state: { ...okState, pausedUntil: ago(1) } })), []);
  assert.deepEqual(titles(base({ games: [{ state: "error", kickoff: ago(50), recorded: false }] })), ["warn 연맹 기록을 가져오지 못한 경기 1개"]);
  assert.deepEqual(titles(base({ state: { ...okState, lastWarning: "팀 이름 다름" } })), ["warn 연맹 수집 경고: 팀 이름 다름"]);
  assert.deepEqual(titles(base({ state: { ...okState, clubRosterChangedAt: ago(2) } })), ["warn 연맹 구단 페이지 명단이 바뀌었습니다. 번호표와 비교해 주세요"]);
  assert.deepEqual(titles(base({ state: { ...okState, clubRosterChangedAt: ago(2), clubRosterAckAt: ago(1) } })), []);
  assert.deepEqual(titles(base({ games: [{ state: "review", kickoff: ago(50), recorded: true }], reviewRows: 3 })), ["check 연맹 기록에서 확인할 것 4개"]);
  assert.deepEqual(titles(base({ games: [{ state: "waiting", kickoff: ago(49), recorded: false }, { state: "waiting", kickoff: ago(10), recorded: false }] })), [
    "check 결과기록지를 기다리는 경기 1개",
  ]);
});

test("kflAlerts: 명단 확인이 끝나고 공개가 꺼져 있으면 켜 달라고 한다", () => {
  const games = [{ state: "recorded", kickoff: ago(50), recorded: true }];
  assert.deepEqual(titles(base({ games, leagues: [{ season: "2026-27", statsLive: false }] })), ["check 명단 확인이 끝났습니다. 2026-27 기록 공개를 켜 주세요"]);
  assert.deepEqual(titles(base({ games, reviewRows: 2, leagues: [{ season: "2026-27", statsLive: false }] })), ["check 연맹 기록에서 확인할 것 2개"]);
  assert.deepEqual(titles(base({ games, leagues: [{ season: "2026-27", statsLive: true }] })), []);
  assert.deepEqual(titles(base({ leagues: [{ season: "2026-27", statsLive: false }] })), []);
});

test("kflAlerts: 문구에 중간점 없음", () => {
  const all = kflAlerts(
    base({
      state: { ...okState, lastOkAt: ago(3), lastListAt: null, shapeErrorAt: ago(1), pausedUntil: "2026-11-18T00:00:00Z", lastWarning: "x", clubRosterChangedAt: ago(1) },
      games: [
        { state: "error", kickoff: ago(60), recorded: false },
        { state: "waiting", kickoff: ago(60), recorded: false },
        { state: "review", kickoff: ago(60), recorded: true },
      ],
      reviewRows: 0,
      leagues: [{ season: "2026-27", statsLive: false }],
    }),
  );
  assert.equal(all.length, 10);
  for (const a of all) assert.ok(!`${a.title}${a.detail ?? ""}${a.action}`.includes("·"), a.title);
});

test("kflSheetUrl: http 연맹 기록지 주소, 모양이 다르면 null", () => {
  assert.equal(
    kflSheetUrl({ league_seq: 116, game_number: 1, home_club: "FSSeoul", away_club: "EunPyeong" }, 10),
    "http://www.futsal.or.kr/gameLeagueRecord.action?club1_id=FSSeoul&club2_id=EunPyeong&league_seq=116&league_type=10&game_number=1",
  );
  assert.equal(kflSheetUrl({ league_seq: 116, game_number: 1, home_club: "a&b", away_club: "EunPyeong" }, 10), null);
});

test("kflStateLabel / kflPlayerLabel", () => {
  assert.deepEqual(["waiting", "recorded", "review", "reviewed", "error"].map(kflStateLabel), ["대기", "반영", "확인 필요", "확인함", "오류"]);
  assert.equal(kflPlayerLabel({ name: "김대현", number: 6, slug: "no-8" }), "6 김대현 (no-8)");
  assert.equal(kflPlayerLabel({ name: "새선수", number: null, slug: "new", is_active: false }), "새선수 (new) (비활동)");
});

test("canGoLive: 반영된 경기 1개 이상 + 확인할 줄 0개", () => {
  assert.deepEqual(canGoLive({ recordedGames: 0, reviewRows: 0 }), { ok: false, reason: "아직 반영된 우리 경기 기록지가 없습니다." });
  assert.deepEqual(canGoLive({ recordedGames: 1, reviewRows: 14 }), { ok: false, reason: "확인할 출전 줄 14개를 먼저 확인해 주세요." });
  assert.deepEqual(canGoLive({ recordedGames: 1, reviewRows: 0 }), { ok: true });
});

test("goalRowsAllLinked + scorersText 재사용", () => {
  assert.equal(goalRowsAllLinked([{ link: "review", goal_minutes: [] }, { link: "auto", goal_minutes: [3] }]), true);
  assert.equal(goalRowsAllLinked([{ link: "review", goal_minutes: [3] }]), false);
  assert.equal(goalRowsAllLinked([{ link: "ignored", goal_minutes: [3] }]), false);
  assert.equal(
    scorersText(
      [
        { shirtNumber: 7, playerId: "a", goalMinutes: [10, 30] },
        { shirtNumber: 9, playerId: "b", goalMinutes: [5] },
      ],
      1,
      [
        { id: "a", name: "김영록" },
        { id: "b", name: "부성인" },
      ],
    ),
    "부성인, 김영록 2, 상대 자책골",
  );
});

test("gkConcededProblem: 끝난 경기만, 같은 선수 두 줄, 합계 ≤ 상대 득점", () => {
  assert.equal(gkConcededProblem([], null), null);
  assert.equal(gkConcededProblem([{ playerId: "a", conceded: 0 }], null), "골키퍼 실점은 끝난 경기(스코어 있음)에만 넣을 수 있습니다.");
  assert.equal(gkConcededProblem([{ playerId: "a", conceded: 1 }, { playerId: "a", conceded: 1 }], 3), "같은 골키퍼가 두 줄에 있습니다. 한 줄로 합쳐 주세요.");
  assert.equal(gkConcededProblem([{ playerId: "a", conceded: 2 }, { playerId: "b", conceded: 2 }], 3), "골키퍼 실점 합계(4)가 상대 득점(3)보다 많습니다.");
  assert.equal(gkConcededProblem([{ playerId: "a", conceded: 2 }, { playerId: "b", conceded: 1 }], 3), null);
  assert.equal(gkConcededProblem([{ playerId: "a", conceded: 0 }], 0), null);
});

test("gkDbMessage: 트리거 거절만 바꾼다", () => {
  assert.equal(gkDbMessage({ message: "gk_conceded_over_score", details: "골키퍼 실점 합계(4)가 상대 득점(3)보다 많습니다." }), "골키퍼 실점 합계(4)가 상대 득점(3)보다 많습니다.");
  assert.equal(gkDbMessage({ message: "duplicate key" }), null);
  assert.equal(gkDbMessage(null), null);
});

test("kflSides: 우리 득점 : 상대 득점", async () => {
  const { kflSides } = await import("../src/lib/admin/kfl.ts");
  assert.deepEqual(kflSides({ home_club: "FSSeoul", away_club: "EunPyeong", home_score: 2, away_score: 5 }, "eunpyeong"), { opponentId: "fsseoul", score: "5 : 2" });
  assert.deepEqual(kflSides({ home_club: "EunPyeong", away_club: "Hwaseong", home_score: null, away_score: null }, "eunpyeong"), { opponentId: "hwaseong", score: null });
});

test("parseGkForm: 빈 줄 건너뜀, 숫자, 골레이로 아님 확인", async () => {
  const { parseGkForm } = await import("../src/lib/admin/kfl.ts");
  const positions = new Map([
    ["g1", { name: "골키퍼", position: "GK" }],
    ["a1", { name: "아라", position: "ALA" }],
  ]);
  assert.deepEqual(parseGkForm({ players: ["g1", ""], conceded: ["2", ""], force: [], positions }), { rows: [{ playerId: "g1", conceded: 2 }] });
  assert.deepEqual(parseGkForm({ players: [""], conceded: ["1"], force: [], positions }), { error: "골키퍼 줄의 선수를 골라 주세요(빈 줄은 '빼기')." });
  assert.deepEqual(parseGkForm({ players: ["g1"], conceded: [""], force: [], positions }), { error: "골키퍼 실점은 0부터 99까지 숫자로 넣어 주세요." });
  assert.deepEqual(parseGkForm({ players: ["g1"], conceded: ["-1"], force: [], positions }), { error: "골키퍼 실점은 0부터 99까지 숫자로 넣어 주세요." });
  assert.deepEqual(parseGkForm({ players: ["a1"], conceded: ["0"], force: [], positions }), { error: "아라 선수는 골레이로가 아닙니다. 맞으면 '그래도 넣기'를 체크해 주세요." });
  assert.deepEqual(parseGkForm({ players: ["a1"], conceded: ["0"], force: ["a1"], positions }), { rows: [{ playerId: "a1", conceded: 0 }] });
  assert.deepEqual(parseGkForm({ players: ["x"], conceded: ["0"], force: [], positions }), { error: "고른 선수를 찾을 수 없습니다. 새로고침한 뒤 다시 골라 주세요." });
});
