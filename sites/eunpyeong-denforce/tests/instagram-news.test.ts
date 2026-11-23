// 인스타 경기 글 → 구단 소식 (2026-11-16) — 제목/본문은 경기 행 값으로
import assert from "node:assert/strict";
import { test } from "node:test";
import type { IgPost } from "../supabase/functions/instagram-sync/embed.ts";
import { matchdayNews, matchForPost, matchWhen, photoNews, resultNews, resultTitles, type MatchLite } from "../supabase/functions/instagram-sync/plan.ts";

// 2026-11-15 09:00 KST
const T = Date.parse("2026-11-15T09:00:00+09:00") / 1000;
const post = (caption: string, takenAt = T): IgPost => ({ code: "DfuejQEzCn7", id: "1", typename: "GraphImage", isVideo: false, takenAt, caption, displayUrl: "" });
const R1: MatchLite = {
  id: "m1",
  kickoff: "2026-11-15T05:00:00Z",
  opponent: "노원제너FS",
  status: "scheduled",
  score_us: null,
  score_them: null,
  venue: "파주NFC풋살장",
  competition: "키움증권 2026-27 FK리그1",
  round: "1R",
  is_home: false,
};
const MD = "𝑴𝑨𝑻𝑪𝑯 𝑫𝑨𝒀 🔵⚪️\n\n🆚 노원제너FS\n⏰ 11.15 (일) 14:00\n📍 파주NFC풋살장\n📺 한국풋살연맹 유튜브\n\n#서울은평덴포스";
const IMG = "https://x.supabase.co/storage/v1/object/public/media/news/ig-DfuejQEzCn7-1.jpg";

test("matchWhen: 한국 시간 '11.15 (일) 14:00'", () => {
  assert.equal(matchWhen("2026-11-15T05:00:00Z"), "11.15 (일) 14:00");
  assert.equal(matchWhen("2026-12-05T05:00:00Z"), "12.05 (토) 14:00");
});

test("MATCH DAY → 구단뉴스: 제목/요약은 경기 행, 본문은 글(꾸민 글씨 → 보통 글자, 해시태그 빼고) + 인스타 링크", () => {
  const m = matchForPost(post(MD), "matchday", [R1]);
  assert.equal(m?.id, "m1");
  const d = matchdayNews(post(MD), m!, IMG);
  assert.equal(d.category, "news");
  assert.equal(d.title, "[1R] 노원제너FS전 매치데이 — 11.15 (일) 14:00 파주NFC풋살장");
  assert.equal(d.summary, "키움증권 2026-27 FK리그1 1R 노원제너FS전, 11.15 (일) 14:00 파주NFC풋살장 (원정)");
  assert.equal(d.date, "2026-11-15");
  assert.deepEqual(d.images, [IMG]);
  assert.match(d.body, /^키움증권/);
  assert.match(d.body, /MATCH DAY/);
  assert.doesNotMatch(d.body, /𝑴|#서울은평덴포스|·/u);
  assert.match(d.body, /https:\/\/www\.instagram\.com\/p\/DfuejQEzCn7\/$/);
  assert.deepEqual(matchdayNews(post(MD), m!, null).images, []);
});

test("결과 → 구단뉴스: 종료면 홈팀 먼저 점수 제목, 아니면 점수 없는 제목", () => {
  const ft = "𝑭𝑼𝑳𝑳 𝑻𝑰𝑴𝑬\n🆚 노원제너FS\n아쉬운 패배";
  const later = post(ft, Date.parse("2026-11-15T17:00:00+09:00") / 1000);
  const m = matchForPost(later, "result", [R1]);
  assert.equal(m?.id, "m1");
  assert.equal(resultNews(later, R1, IMG, "2026-11-15").title, "[1R] 노원제너FS전 경기 결과");
  const done = { ...R1, status: "finished", score_us: 0, score_them: 7 };
  assert.equal(resultNews(later, done, IMG, "2026-11-15").title, "[1R 결과] 노원제너FS 7 : 0 서울은평 덴포스");
  assert.equal(resultNews(null, { ...done, is_home: true, score_us: 3, score_them: 1, scorers: "김영록 2, 윤창욱" }, null, "2026-11-15").title, "[1R 결과] 서울은평 덴포스 3 : 1 노원제너FS");
  const noPost = resultNews(null, { ...done, scorers: "김영록" }, null, "2026-11-15");
  assert.match(noPost.body, /득점: 김영록/);
  assert.doesNotMatch(noPost.body, /instagram/);
});

test("MATCH PHOTO → 구단사진: 3일 안 경기가 하나일 때만", () => {
  const p = post("𝑴𝑨𝑻𝑪𝑯 𝑷𝑯𝑶𝑻𝑶\n1R 노원제너FS전", Date.parse("2026-11-16T12:00:00+09:00") / 1000);
  const m = matchForPost(p, "photo", [R1]);
  assert.equal(photoNews(p, m!, [IMG]).title, "1R 노원제너FS전 경기 사진");
  assert.equal(photoNews(p, m!, [IMG]).category, "photo");
  // 두 경기 → 모름, 경기 없음 → 모름
  assert.equal(matchForPost(p, "photo", [R1, { ...R1, id: "m2", kickoff: "2026-11-16T01:00:00Z" }]), null);
  assert.equal(matchForPost(p, "photo", []), null);
});

test("경기를 못 찾으면 null (다른 날, 다른 상대)", () => {
  assert.equal(matchForPost(post(MD, Date.parse("2026-11-14T09:00:00+09:00") / 1000), "matchday", [R1]), null);
  assert.equal(matchForPost(post(MD.replace("노원제너FS", "화성FS")), "matchday", [R1]), null);
  assert.equal(matchForPost(post(MD), "welcome", [R1]), null);
});

test("MATCH PHOTO: 최근 7일 안 경기가 하나이고 3일 안일 때만 — 연속 경기(7R 1/16, 8R 1/17) 뒤 1/19 글은 null", () => {
  const r7 = { ...R1, id: "r7", round: "7R", kickoff: "2027-01-16T05:00:00Z" };
  const r8 = { ...R1, id: "r8", round: "8R", kickoff: "2027-01-17T08:00:00Z" };
  assert.equal(matchForPost(post("MATCH PHOTO", Date.parse("2027-01-19T05:36:00Z") / 1000), "photo", [r7, r8]), null);
  // 하나뿐이어도 3일 넘으면 null, 3일 안이면 그 경기
  assert.equal(matchForPost(post("MATCH PHOTO", Date.parse("2027-01-21T05:36:00Z") / 1000), "photo", [r8]), null);
  assert.equal(matchForPost(post("MATCH PHOTO", Date.parse("2027-01-19T05:36:00Z") / 1000), "photo", [r8])?.id, "r8");
});

test("확인 필요 메모가 있던 글은 본문에 글을 싣지 않는다 (경기 행 값만)", () => {
  const ft = "경기결과\n서울은평덴포스 2 : 3 노원제너FS";
  const done = { ...R1, status: "finished", score_us: 3, score_them: 3 };
  const withCap = resultNews(post(ft), done, IMG, "2026-11-15");
  const noCap = resultNews(post(ft), done, IMG, "2026-11-15", false);
  assert.match(withCap.body, /2 : 3/);
  assert.doesNotMatch(noCap.body, /2 : 3/);
  assert.match(noCap.body, /노원제너FS 3 : 3 서울은평 덴포스/);
  assert.doesNotMatch(matchdayNews(post(MD), R1, IMG, false).body, /MATCH DAY/);
  assert.doesNotMatch(photoNews(post("MATCH PHOTO 멋진 경기"), R1, [IMG], false).body, /멋진/);
});

test("resultTitles: 점수 제목 + 점수 없는 제목 (같은 경기 두 번째 글 막기)", () => {
  const done = { ...R1, status: "finished", score_us: 0, score_them: 7 };
  assert.deepEqual(resultTitles(done), ["[1R 결과] 노원제너FS 7 : 0 서울은평 덴포스", "[1R] 노원제너FS전 경기 결과"]);
  assert.deepEqual(resultTitles(R1), ["[1R] 노원제너FS전 경기 결과"]);
});
