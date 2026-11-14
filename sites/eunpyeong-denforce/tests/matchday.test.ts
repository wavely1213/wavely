// 매치데이 포스터 팝업 (D-096)
import assert from "node:assert/strict";
import { test } from "node:test";
import { activePoster, kstDay, msUntilPosterChange, posterWindow, posterWindows, shouldShowPoster } from "../src/lib/matchday.ts";
import { matchdayPosterTarget, type MatchLite } from "../supabase/functions/instagram-sync/plan.ts";
import type { IgPost } from "../supabase/functions/instagram-sync/embed.ts";
import type { Match } from "../src/types/index.ts";

const POSTER = "https://x.supabase.co/storage/v1/object/public/media/matchday/a.jpg";
const m = (over: Partial<Match> = {}): Match => ({
  id: "m1",
  competition: "c",
  round: "2R",
  kickoff: "2026-11-21T14:00:00+09:00",
  venue: "v",
  isHome: false,
  opponent: "강원FS",
  status: "scheduled",
  score: null,
  highlightUrl: null,
  replayUrl: null,
  scorers: null,
  matchdayPoster: POSTER,
  ...over,
});
const t = (iso: string) => Date.parse(iso);

test("posterWindow: 경기 날 한국 0시 ~ 다음 날 0시", () => {
  const w = posterWindow(m())!;
  assert.equal(w.start, t("2026-11-21T00:00:00+09:00"));
  assert.equal(w.end, t("2026-11-22T00:00:00+09:00"));
  // 한국 시간 이른 아침 경기 (UTC 로는 전날)
  const early = posterWindow(m({ kickoff: "2026-11-21T08:00:00+09:00" }))!;
  assert.equal(early.start, t("2026-11-21T00:00:00+09:00"));
});

test("posterWindow: 종료 경기, 포스터 없음, https 아님, 날짜 오류 → null", () => {
  assert.equal(posterWindow(m({ status: "finished", score: { us: 1, them: 0 } })), null);
  assert.equal(posterWindow(m({ matchdayPoster: null })), null);
  assert.equal(posterWindow(m({ matchdayPoster: undefined })), null);
  assert.equal(posterWindow(m({ matchdayPoster: "http://x/a.jpg" })), null);
  assert.equal(posterWindow(m({ kickoff: "없음" })), null);
});

test("activePoster: 전날 23:59 / 당일 0:00 / 경기 중 / 결과 입력 뒤 / 다음 날", () => {
  const ws = posterWindows([m()], t("2026-11-20T00:00:00+09:00"));
  assert.equal(activePoster(ws, t("2026-11-20T23:59:59+09:00")), null);
  assert.equal(activePoster(ws, t("2026-11-21T00:00:00+09:00"))?.matchId, "m1");
  assert.equal(activePoster(ws, t("2026-11-21T14:30:00+09:00"))?.matchId, "m1");
  // 결과 입력 뒤: 경기 캐시가 새로 만들어지며 창이 빠진다
  assert.deepEqual(posterWindows([m({ status: "finished", score: { us: 2, them: 1 } })], t("2026-11-21T16:00:00+09:00")), []);
  assert.equal(activePoster(ws, t("2026-11-22T00:00:00+09:00")), null);
});

test("posterWindows: 지난 창 빼고 시작 순, 같은 날 두 경기면 먼저 것", () => {
  const ws = posterWindows(
    [m({ id: "b", kickoff: "2026-12-05T14:00:00+09:00" }), m({ id: "old", kickoff: "2026-11-15T14:00:00+09:00" }), m({ id: "a" }), m({ id: "a2", kickoff: "2026-11-21T19:00:00+09:00" })],
    t("2026-11-20T12:00:00+09:00"),
  );
  assert.deepEqual(ws.map((w) => w.matchId), ["a", "a2", "b"]);
  assert.equal(activePoster(ws, t("2026-11-21T20:00:00+09:00"))?.matchId, "a");
});

test("shouldShowPoster: 하루 한 번 (닫은 날 = 오늘이면 안 보임), 저장값 없음이면 보임", () => {
  const now = t("2026-11-21T10:00:00+09:00");
  assert.equal(kstDay(now), "2026-11-21");
  assert.equal(shouldShowPoster(null, now), true);
  assert.equal(shouldShowPoster("2026-11-21", now), false);
  assert.equal(shouldShowPoster("2026-11-20", now), true);
  // 한국 0시 직후 (UTC 로는 전날 15시)
  assert.equal(shouldShowPoster("2026-11-20", t("2026-11-21T00:00:30+09:00")), true);
});

test("msUntilPosterChange: 다음 경계까지", () => {
  const ws = posterWindows([m()], 0);
  assert.equal(msUntilPosterChange(ws, t("2026-11-20T23:00:00+09:00")), 3_600_000);
  assert.equal(msUntilPosterChange(ws, t("2026-11-21T23:00:00+09:00")), 3_600_000);
  assert.equal(msUntilPosterChange(ws, t("2026-11-22T01:00:00+09:00")), null);
});

/* instagram-sync: MATCH DAY 사진 → 포스터 칸 (비어 있을 때만) */
const T = 1792404641; // 2026-10-19 19:10 KST
const CAPTION = "🔵MATCH DAY⚪️\n\n15라운드\n🆚 서울은평덴포스 vs 전주시민풋살구단\n🕑 13:00\n📍 은평다목적체육관";
const post: IgPost = { code: "X", id: "1", typename: "GraphImage", isVideo: false, takenAt: T, caption: CAPTION, displayUrl: "" };
const lite = (over: Partial<MatchLite> = {}): MatchLite => ({ id: "m", kickoff: "2026-10-19T04:00:00Z", opponent: "전주시민 풋살구단", status: "scheduled", score_us: null, score_them: null, matchday_poster_url: null, ...over });

test("matchdayPosterTarget: 같은 날 같은 상대, 비어 있을 때만", () => {
  assert.equal(matchdayPosterTarget(post, [lite()]), "m");
  assert.equal(matchdayPosterTarget(post, [lite({ matchday_poster_url: POSTER })]), null); // 관리자 값 우선
  assert.equal(matchdayPosterTarget(post, [lite({ opponent: "화성FS" })]), null);
  assert.equal(matchdayPosterTarget(post, [lite({ kickoff: "2026-10-20T04:00:00Z" })]), null);
  // 열이 없는 DB (마이그레이션 전) → 건너뜀
  const { matchday_poster_url: _omit, ...noColumn } = lite();
  void _omit;
  assert.equal(matchdayPosterTarget(post, [noColumn]), null);
  assert.equal(matchdayPosterTarget({ ...post, caption: "🔵MATCH DAY⚪️\n오늘 응원해 주세요" }, [lite()]), null);
});
