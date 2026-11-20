import assert from "node:assert/strict";
import { test } from "node:test";
import { highlightLabel, matchHighlights } from "../src/lib/highlights.ts";
import type { Match } from "../src/types/index.ts";

// 은평 하이라이트 모아 보기 (D-091)

const base: Match = {
  id: "x",
  kickoff: "2026-11-15T05:00:00Z",
  competition: "키움증권 2026-27 FK리그1",
  round: "1R",
  opponent: "노원제너FS",
  isHome: false,
  venue: "파주 NFC 풋살장",
  status: "finished",
  score: { us: 2, them: 3 },
  highlightUrl: null,
  replayUrl: null,
  scorers: null,
} as unknown as Match;

test("하이라이트 있는 종료 경기만, 최신순, 홈팀 왼쪽 스코어, 유튜브 썸네일", () => {
  const list = matchHighlights(
    [
      { ...base, id: "a", highlightUrl: "https://www.youtube.com/watch?v=AAAAAAAAAAA" },
      { ...base, id: "b", kickoff: "2026-11-29T05:00:00Z", isHome: true, opponent: "화성FS", score: { us: 3, them: 2 }, highlightUrl: "https://youtu.be/BBBBBBBBBBB" },
      { ...base, id: "c", kickoff: "2026-11-22T05:00:00Z" },
      { ...base, id: "d", kickoff: "2026-12-06T05:00:00Z", status: "scheduled", score: null, highlightUrl: "https://www.youtube.com/watch?v=DDDDDDDDDDD" },
    ] as Match[],
    "서울은평 덴포스",
  );
  assert.deepEqual(list.map((h) => h.id), ["b", "a"]);
  assert.equal(list[0].home, "서울은평 덴포스");
  assert.equal(list[0].homeScore, 3);
  assert.equal(list[1].home, "노원제너FS");
  assert.equal(list[1].homeScore, 3);
  assert.equal(list[1].awayScore, 2);
  assert.equal(list[0].thumbnail, "https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg");
  assert.equal(list[0].href, "https://www.youtube.com/watch?v=BBBBBBBBBBB");
  assert.equal(list[0].date, "2026.11.29");
  assert.equal(list[0].competition, "키움증권 2026-27 FK리그1 / 1R");
  assert.equal(highlightLabel(list[0]), "하이라이트 영상 - 서울은평 덴포스 3 : 2 화성FS, 2026.11.29 (새 창)");
});

test("limit, 유튜브가 아니면 썸네일 없음", () => {
  const ms = Array.from({ length: 6 }, (_, i) => ({ ...base, id: `m${i}`, kickoff: `2026-11-1${i}T05:00:00Z`, highlightUrl: "https://www.youtube.com/watch?v=AAAAAAAAAAA" })) as Match[];
  assert.equal(matchHighlights(ms, "우리", 4).length, 4);
  const ig = matchHighlights([{ ...base, highlightUrl: "https://www.instagram.com/reel/ABCDEFG/" } as Match], "우리");
  assert.equal(ig[0].thumbnail, null);
});
