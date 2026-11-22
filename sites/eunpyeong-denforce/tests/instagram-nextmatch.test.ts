// NEXT MATCH 글 → 경기의 NEXT 포스터/게시물 칸 (D-102) — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyPost, parseNextMatch, type IgPost } from "../supabase/functions/instagram-sync/embed.ts";
import { appliedNextKey, planNextMatch, postingDraft, type MatchLite } from "../supabase/functions/instagram-sync/plan.ts";

// 실제 글 Df1I2_DPhnn (2026-11-17)
const NEXT = "NEXT MATCH 🔵⚪️\n\n🆚 용인지솔FS\n⏰ 11.21 (토) 14:00\n📍 파주NFC풋살장\n📺 한국풋살연맹 유튜브\n\n#서울은평덴포스";
const T = Date.parse("2026-11-17T18:30:00+09:00") / 1000;
const post = (caption = NEXT, takenAt = T): IgPost => ({ code: "Df1I2_DPhnn", id: "1", typename: "GraphImage", isVideo: false, takenAt, caption, displayUrl: "" });
// 2R 7a8a4242 — 지금 is_home=true 로 고쳐짐. 홈/원정은 연결 조건이 아니다
const R2: MatchLite = {
  id: "7a8a4242",
  kickoff: "2026-11-21T05:00:00Z",
  opponent: "용인지솔FS",
  status: "scheduled",
  score_us: null,
  score_them: null,
  venue: "파주NFC풋살장",
  is_home: true,
  next_poster_url: null,
  next_post_url: null,
};

test("classifyPost: 첫 줄 NEXT MATCH (대소문자, 띄어쓰기, 꾸밈 허용)만 nextmatch", () => {
  const c = (caption: string) => classifyPost({ caption, isVideo: false });
  assert.equal(c(NEXT), "nextmatch");
  assert.equal(c("🔵 Next  Match ⚪️\n\n🆚 화성FS"), "nextmatch");
  assert.equal(c("𝑵𝑬𝑿𝑻 𝑴𝑨𝑻𝑪𝑯\n🆚 화성FS"), "nextmatch");
  assert.equal(c("우리의 NEXT MATCH 는 화성FS 전입니다"), "other");
  assert.equal(c("MATCH DAY 🔵⚪️\n\n🆚 노원제너FS"), "matchday");
});

test("parseNextMatch: 상대, 서울 날짜(연도는 글 날짜 기준), 시각", () => {
  assert.deepEqual(parseNextMatch(NEXT, T), { opponent: "용인지솔FS", date: "2026-11-21", time: "14:00" });
  // 12월 글의 1월 경기 → 다음 해
  const dec = Date.parse("2026-12-28T10:00:00+09:00") / 1000;
  assert.deepEqual(parseNextMatch("NEXT MATCH\n🆚 강원FS\n⏰ 1.16 (토) 15:00", dec), { opponent: "강원FS", date: "2027-01-16", time: "15:00" });
  assert.deepEqual(parseNextMatch("NEXT MATCH\n🆚 강원FS\n⏰ 2.30 15:00", dec).date, null);
  assert.deepEqual(parseNextMatch("NEXT MATCH\n⏰ 11.21 14:00", T).opponent, null);
});

test("planNextMatch: 같은 서울 날짜 + 같은 상대 경기 하나 → 빈 칸 둘 (홈/원정 무관)", () => {
  assert.deepEqual(planNextMatch(post(), [R2], new Set()), { matchId: "7a8a4242", fields: ["next_poster_url", "next_post_url"], postUrl: "https://www.instagram.com/p/Df1I2_DPhnn/" });
  // 띄어쓰기 다른 상대 이름도 같은 팀
  assert.equal("matchId" in planNextMatch(post(), [{ ...R2, opponent: "용인 지솔FS" }], new Set()), true);
});

test("planNextMatch: 이미 값이 있거나, 넣었거나 관리자가 지운 칸은 다시 채우지 않는다", () => {
  assert.deepEqual(planNextMatch(post(), [{ ...R2, next_post_url: "https://www.instagram.com/p/OTHER/" }], new Set()), {
    matchId: "7a8a4242",
    fields: ["next_poster_url"],
    postUrl: "https://www.instagram.com/p/Df1I2_DPhnn/",
  });
  const cleared = new Set([appliedNextKey("7a8a4242", "next_poster_url"), appliedNextKey("7a8a4242", "next_post_url")]);
  assert.deepEqual(planNextMatch(post(), [R2], cleared), { matchId: "7a8a4242", fields: [], postUrl: "https://www.instagram.com/p/Df1I2_DPhnn/" });
});

test("planNextMatch: 못 찾거나 둘 이상이면 메모만, 열이 없는 DB 면 아무것도 안 함", () => {
  assert.deepEqual(planNextMatch(post(), [{ ...R2, opponent: "화성FS" }], new Set()), { note: "NEXT MATCH: 2026-11-21 용인지솔FS 경기를 찾지 못함 — 연결하지 않음" });
  assert.deepEqual(planNextMatch(post(), [R2, { ...R2, id: "dup" }], new Set()), { note: "NEXT MATCH: 2026-11-21 용인지솔FS 경기가 2개 — 연결하지 않음" });
  assert.deepEqual(planNextMatch(post("NEXT MATCH\n\n📍 파주"), [R2], new Set()), { note: "NEXT MATCH 글에서 상대/날짜를 읽지 못함 — 관리자 › 경기에서 NEXT MATCH 포스터를 직접" });
  const old: MatchLite = { ...R2 };
  delete old.next_poster_url;
  delete old.next_post_url;
  assert.deepEqual(planNextMatch(post(), [old], new Set()), { note: null });
});

test("포스팅은 지금과 같다 (NEXT MATCH 글도 첫 줄 제목, 기타 글과 같은 모양)", () => {
  assert.deepEqual(postingDraft(post(), "nextmatch"), postingDraft(post(), "other"));
});
