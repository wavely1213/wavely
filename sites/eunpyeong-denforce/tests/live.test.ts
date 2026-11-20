import assert from "node:assert/strict";
import { test } from "node:test";
import { isLive, liveWindow, msUntilChange } from "../src/lib/live.ts";

// 경기 당일 LIVE (D-092) — 킥오프 -3h / -2h / 경기 중 / +4h / 종료

const K = Date.parse("2026-11-21T05:00:00Z"); // 14:00 서울
const H = 3600_000;
const m = { kickoff: "2026-11-21T05:00:00Z", status: "scheduled" as const, replayUrl: "https://www.youtube.com/watch?v=ABCDEFGHIJK" };

test("시간 창: 2시간 전부터 4시간 뒤 직전까지", () => {
  const w = liveWindow(m);
  assert.ok(w);
  const rows: Array<[number, boolean]> = [
    [K - 3 * H, false],
    [K - 2 * H - 1, false],
    [K - 2 * H, true],
    [K, true],
    [K + 90 * 60_000, true],
    [K + 4 * H - 1, true],
    [K + 4 * H, false],
  ];
  for (const [now, want] of rows) assert.equal(isLive(w, now), want, String((now - K) / H));
});

test("종료 경기, 주소 없음, http 주소, 잘못된 날짜는 LIVE 없음", () => {
  assert.equal(liveWindow({ ...m, status: "finished" }), null);
  assert.equal(liveWindow({ ...m, replayUrl: null }), null);
  assert.equal(liveWindow({ ...m, replayUrl: "http://x" }), null);
  assert.equal(liveWindow({ ...m, kickoff: "nope" }), null);
  assert.equal(isLive(null, K), false);
});

test("다음 바뀌는 때", () => {
  const w = liveWindow(m);
  assert.equal(msUntilChange(w, K - 3 * H), H);
  assert.equal(msUntilChange(w, K), 4 * H);
  assert.equal(msUntilChange(w, K + 5 * H), null);
});
