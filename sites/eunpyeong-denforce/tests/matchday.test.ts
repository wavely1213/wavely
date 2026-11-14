// 매치데이 포스터 팝업 (D-096) — 표시 규칙과 드라이브 폴더 연결
import assert from "node:assert/strict";
import { test } from "node:test";
import { activePoster, hideKey, kstDay, msUntilPosterChange, posterWindow, posterWindows, shouldShowPoster } from "../src/lib/matchday.ts";
import {
  matchForFolder,
  needsPoster,
  parseFolderName,
  planFolder,
  posterKind,
  shouldRun,
  sizedThumb,
  storagePath,
  type PosterMatch,
} from "../supabase/functions/matchday-poster-sync/plan.ts";
import type { Match } from "../src/types/index.ts";

const MD = "https://x.supabase.co/storage/v1/object/public/media/matchday/m1.jpg";
const FT = "https://x.supabase.co/storage/v1/object/public/media/matchday/m1-ft.jpg";
const m = (over: Partial<Match> = {}): Match => ({
  id: "m1",
  competition: "c",
  round: "2R",
  kickoff: "2026-11-21T14:00:00+09:00",
  venue: "v",
  isHome: false,
  opponent: "용인지솔FS",
  status: "scheduled",
  score: null,
  highlightUrl: null,
  replayUrl: null,
  scorers: null,
  matchdayPoster: MD,
  fulltimePoster: null,
  ...over,
});
const t = (iso: string) => Date.parse(iso);
const at = (ms: Match[], iso: string) => {
  const a = activePoster(posterWindows(ms), t(iso));
  return a ? `${a.window.matchId}:${a.kind}` : null;
};
const done = { status: "finished" as const, score: { us: 3, them: 2 } };

test("규칙 1~5: 전날 23:59 / 당일 0:00 / 경기 중 / 끝남(FT 없음) / FT 올라옴 / 다음 날 0:00", () => {
  assert.equal(at([m()], "2026-11-20T23:59:59+09:00"), null); // 1
  assert.equal(at([m()], "2026-11-21T00:00:00+09:00"), "m1:matchday"); // 3
  assert.equal(at([m()], "2026-11-21T15:30:00+09:00"), "m1:matchday");
  assert.equal(at([m(done)], "2026-11-21T16:00:00+09:00"), null); // 4 결과 입력
  assert.equal(at([m()], "2026-11-21T18:00:00+09:00"), null); // 4 킥오프 + 4시간
  assert.equal(at([m({ ...done, fulltimePoster: FT })], "2026-11-21T16:00:00+09:00"), "m1:fulltime"); // 2
  assert.equal(at([m({ ...done, fulltimePoster: FT })], "2026-11-21T23:59:59+09:00"), "m1:fulltime");
  assert.equal(at([m({ ...done, fulltimePoster: FT })], "2026-11-22T00:00:00+09:00"), null); // 5
});

test("FULL TIME 이 먼저 올라오면 그것, MATCH DAY 없이 FULL TIME 만 있어도", () => {
  assert.equal(at([m({ fulltimePoster: FT })], "2026-11-21T10:00:00+09:00"), "m1:fulltime");
  assert.equal(at([m({ matchdayPoster: null, fulltimePoster: FT, ...done })], "2026-11-21T20:00:00+09:00"), "m1:fulltime");
});

test("posterWindow: 포스터 없음, https 아님, 날짜 오류 → null. 서울 0시 기준", () => {
  assert.equal(posterWindow(m({ matchdayPoster: null })), null);
  assert.equal(posterWindow(m({ matchdayPoster: "http://x/a.jpg" })), null);
  assert.equal(posterWindow(m({ kickoff: "없음" })), null);
  assert.equal(posterWindow(m({ kickoff: "2026-11-21T08:00:00+09:00" }))!.start, t("2026-11-21T00:00:00+09:00"));
});

test("같은 날 두 경기: 먼저 것, 끝나면 다음 것", () => {
  const ms = [m({ id: "b", kickoff: "2026-11-21T19:00:00+09:00" }), m({ id: "a", kickoff: "2026-11-21T13:00:00+09:00" })];
  assert.equal(at(ms, "2026-11-21T12:00:00+09:00"), "a:matchday");
  assert.equal(at(ms, "2026-11-21T17:30:00+09:00"), "b:matchday");
});

test("오늘 하루 보지 않기: 종류별 키, 닫은 날 = 오늘이면 안 보임", () => {
  assert.notEqual(hideKey("m1", "matchday"), hideKey("m1", "fulltime"));
  const now = t("2026-11-21T10:00:00+09:00");
  assert.equal(kstDay(now), "2026-11-21");
  assert.equal(shouldShowPoster(null, now), true);
  assert.equal(shouldShowPoster("2026-11-21", now), false);
  assert.equal(shouldShowPoster("2026-11-20", t("2026-11-21T00:00:30+09:00")), true);
});

test("msUntilPosterChange: 0시, 킥오프 + 4시간, 다음 날 0시", () => {
  const ws = posterWindows([m()]);
  assert.equal(msUntilPosterChange(ws, t("2026-11-20T23:00:00+09:00")), 3_600_000);
  assert.equal(msUntilPosterChange(ws, t("2026-11-21T17:00:00+09:00")), 3_600_000);
  assert.equal(msUntilPosterChange(ws, t("2026-11-21T23:00:00+09:00")), 3_600_000);
  assert.equal(msUntilPosterChange(ws, t("2026-11-22T01:00:00+09:00")), null);
});

/* 드라이브 폴더 → 경기 (matchday-poster-sync) */
test("parseFolderName: 'MM/DD vs 상대 (HOME|AWAY)'", () => {
  assert.deepEqual(parseFolderName("11/15 vs 노원제너FS (AWAY)"), { month: 11, day: 15, opponent: "노원제너FS", side: "AWAY" });
  assert.deepEqual(parseFolderName("12/5 VS 강원 FS (home)"), { month: 12, day: 5, opponent: "강원 FS", side: "HOME" });
  assert.equal(parseFolderName("사진 모음"), null);
  assert.equal(parseFolderName("13/40 vs A (HOME)"), null);
});

test("posterKind: MATCH-DAY / FULL", () => {
  assert.equal(posterKind("MATCH-DAY.jpg"), "matchday_poster_url");
  assert.equal(posterKind("match day 2.png"), "matchday_poster_url");
  assert.equal(posterKind("FULL-TIME.jpg"), "fulltime_poster_url");
  assert.equal(posterKind("fulltime_final.jpg"), "fulltime_poster_url");
  assert.equal(posterKind("라인업.jpg"), null);
});

const pm = (over: Partial<PosterMatch> = {}): PosterMatch => ({ id: "m1", kickoff: "2026-11-15T05:00:00Z", opponent: "노원제너FS", matchday_poster_url: null, fulltime_poster_url: null, ...over });

test("matchForFolder: 같은 달/일 + 같은 상대(띄어쓰기 무시), 연도는 지금과 가까운 쪽", () => {
  const f = parseFolderName("11/15 vs 노원제너 FS (AWAY)")!;
  const now = t("2026-11-14T12:00:00Z");
  assert.equal((matchForFolder(f, [pm()], now) as PosterMatch).id, "m1");
  const two = [pm({ id: "old", kickoff: "2025-11-15T05:00:00Z" }), pm()];
  assert.equal((matchForFolder(f, two, now) as PosterMatch).id, "m1");
  assert.equal(typeof matchForFolder(f, [pm({ opponent: "강원FS" })], now), "string");
  // 서울 날짜 (UTC 로는 전날)
  assert.equal((matchForFolder(f, [pm({ kickoff: "2026-11-14T23:30:00Z" })], now) as PosterMatch).id, "m1");
});

const file = (name: string, over: Record<string, string> = {}) => ({ id: `id_${name.replace(/\W/g, "")}_0000000`, name, mimeType: "image/jpeg", thumbnailLink: "https://lh3.googleusercontent.com/abc=s220", ...over });

test("planFolder: 빈 칸만, 관리자 값 우선, 지운 칸 다시 안 채움, 썸네일 1600", () => {
  const files = [file("MATCH-DAY.jpg"), file("FULL-TIME.jpg"), file("라인업.jpg")];
  const p = planFolder(pm(), files, new Set());
  assert.deepEqual(
    p.updates.map((u) => [u.field, u.thumb]),
    [
      ["matchday_poster_url", "https://lh3.googleusercontent.com/abc=s1600"],
      ["fulltime_poster_url", "https://lh3.googleusercontent.com/abc=s1600"],
    ],
  );
  assert.deepEqual(planFolder(pm({ matchday_poster_url: MD }), files, new Set()).updates.map((u) => u.field), ["fulltime_poster_url"]);
  assert.deepEqual(planFolder(pm(), files, new Set(["m1:matchday_poster_url"])).updates.map((u) => u.field), ["fulltime_poster_url"]);
  const noThumb = planFolder(pm(), [file("MATCH-DAY.jpg", { thumbnailLink: "" })], new Set());
  assert.deepEqual(noThumb.updates, []);
  assert.equal(noThumb.notes.length, 1);
  // 같은 종류 여러 장 → 최근에 바뀐 것
  const newer = planFolder(pm(), [file("MATCH-DAY.jpg", { modifiedTime: "2026-11-10" }), file("MATCH-DAY 2.jpg", { modifiedTime: "2026-11-12", id: "newer_file_id_123" })], new Set());
  assert.equal(newer.updates[0].fileId, "newer_file_id_123");
});

test("needsPoster, storagePath, sizedThumb", () => {
  assert.equal(needsPoster(pm(), new Set()), true);
  assert.equal(needsPoster(pm({ matchday_poster_url: MD, fulltime_poster_url: FT }), new Set()), false);
  assert.equal(needsPoster(pm({ matchday_poster_url: MD }), new Set(["m1:fulltime_poster_url"])), false);
  assert.equal(storagePath("m1", "matchday_poster_url"), "matchday/m1.jpg");
  assert.equal(storagePath("m1", "fulltime_poster_url"), "matchday/m1-ft.jpg");
  assert.equal(sizedThumb("https://a/b", 1600), "https://a/b=s1600");
});

test("shouldRun: 경기 날(서울)은 매번, 아니면 마지막 성공 뒤 3시간", () => {
  const kick = ["2026-11-21T05:00:00Z"];
  assert.equal(shouldRun(t("2026-11-21T00:10:00+09:00"), kick, new Date().toISOString()), true);
  assert.equal(shouldRun(t("2026-11-20T12:00:00+09:00"), kick, "2026-11-20T02:00:00Z"), false);
  assert.equal(shouldRun(t("2026-11-20T12:00:00+09:00"), kick, "2026-11-20T00:00:00Z"), true);
  assert.equal(shouldRun(t("2026-11-20T12:00:00+09:00"), kick, null), true);
});

test("포스터 링크: 인스타그램 게시물 주소만 창에 실린다", () => {
  const w = posterWindow(m({ matchdayPost: "https://www.instagram.com/p/AAA/", fulltimePost: "https://example.com/p" }))!;
  assert.equal(w.matchdayPost, "https://www.instagram.com/p/AAA/");
  assert.equal(w.fulltimePost, null);
});
