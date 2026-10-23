// 구단 인스타그램 새 게시물 확인 (D-064) — 임베드 읽기, 종류 나누기, 경기 글 읽기. 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyPost, kstDateTime, knownCodes, parseMatchday, parseProfileEmbed, parseResult } from "../supabase/functions/instagram-sync/embed.ts";

/** 실제 임베드와 같은 모양: <script> 안 JSON 의 "contextJSON" 값이 JSON 문자열 (두 번 인코딩) */
function embedHtml(media: unknown[]): string {
  const context = { context: { username: "eunpyeong_denforce", graphql_media: media.map((m) => ({ shortcode_media: m })) } };
  return `<html><script>requireLazy([],function(){x({"isProfileEmbed":true,"contextJSON":${JSON.stringify(JSON.stringify(context))}})});</script></html>`;
}

const welcome = {
  __typename: "GraphImage",
  id: "4011302866266185993",
  shortcode: "DerArQ-TWEJ",
  is_video: false,
  taken_at_timestamp: 1792404641,
  display_url: "https://scontent.example/a.jpg",
  edge_media_to_caption: { edges: [{ node: { text: "𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝\n\n서울은평덴포스가 확실한 존재감 김종호 선수를 영입했습니다." } }] },
};

test("parseProfileEmbed: 게시물 코드/ID/종류/시각/글을 최신순 그대로", () => {
  const reel = { __typename: "GraphVideo", id: "1", shortcode: "DReel_1", is_video: true, taken_at_timestamp: 1792400000, edge_media_to_caption: { edges: [] } };
  const posts = parseProfileEmbed(embedHtml([welcome, reel]));
  assert.equal(posts.length, 2);
  assert.deepEqual(posts[0], {
    code: "DerArQ-TWEJ",
    id: "4011302866266185993",
    typename: "GraphImage",
    isVideo: false,
    takenAt: 1792404641,
    caption: welcome.edge_media_to_caption.edges[0].node.text,
    displayUrl: "https://scontent.example/a.jpg",
  });
  assert.equal(posts[1].isVideo, true);
  assert.equal(posts[1].caption, "", "글 없는 게시물은 빈 글");
});

test("parseProfileEmbed: 모양이 바뀌면 0개로 넘어가지 않고 오류", () => {
  assert.throws(() => parseProfileEmbed("<html>로그인하세요</html>"), /contextJSON/);
  assert.throws(() => parseProfileEmbed(`"contextJSON":${JSON.stringify(JSON.stringify({ context: {} }))}`), /graphql_media/);
  assert.throws(() => parseProfileEmbed(embedHtml([{ id: "1", taken_at_timestamp: 1 }])), /shortcode/);
});

test("classifyPost: 구단 머리말로 종류 나누기", () => {
  const c = (caption: string, isVideo = false) => classifyPost({ caption, isVideo });
  assert.equal(c("𝑾𝑬𝑳𝑪𝑶𝑴𝑬 🤝\n\n서울은평덴포스가 …"), "welcome", "꾸밈 글자(수학 굵은체)도 WELCOME");
  assert.equal(c("GOOD LUCK\n박영완 선수가 이적을 하며 …"), "farewell");
  assert.equal(c("THANK YOU\n…"), "farewell");
  assert.equal(c("🔵MATCH DAY⚪️\n\n15라운드"), "matchday");
  assert.equal(c("🔵MATCHDAY⚪️\n\nPLAYOFF"), "matchday");
  assert.equal(c("⚪15라운드 경기결과🔵\n\n서울은평덴포스 7 : 5 전주시민풋살구단"), "result");
  assert.equal(c("⚪FA컵 3라운드 경기결과🔵"), "result");
  assert.equal(c("MATCH PHOTO📷"), "photo");
  assert.equal(c("No.37 백승하의 선제골🔥", true), "reel", "영상은 글과 상관없이 릴스");
  assert.equal(c("No.37 백승하의 선제골🔥"), "other");
  assert.equal(c(""), "other");
});

test("kstDateTime: 한국 시간", () => {
  assert.equal(kstDateTime(1792404641), "2026-10-19 19:10");
  assert.equal(kstDateTime(0), "1970-01-01 09:00");
});

test("parseMatchday: 대회/라운드, 상대, 시각, 경기장", () => {
  assert.deepEqual(
    parseMatchday("🔵MATCH DAY⚪️\n\n15라운드\n🆚 서울은평덴포스 vs 전주시민풋살구단\n🕑 13:00\n📍 은평다목적체육관\n📺 YouTube 생중계 [한국풋살연맹KFL]\n\n#서울은평덴포스 #fk리그"),
    { heading: "15라운드", opponent: "전주시민풋살구단", time: "13:00", venue: "은평다목적체육관" },
  );
  assert.deepEqual(parseMatchday("🔵MATCH DAY⚪️\n\n2026 FK CUP 3R\n🆚 인천ZD스포츠 vs 서울은평덴포스\n🕑 15:00\n📍 단양국민체육센터"), {
    heading: "2026 FK CUP 3R",
    opponent: "인천ZD스포츠",
    time: "15:00",
    venue: "단양국민체육센터",
  });
  assert.deepEqual(parseMatchday("🔵MATCH DAY⚪️\n오늘 경기 응원해 주세요"), { heading: "", opponent: null, time: null, venue: null }, "모양이 다르면 빈 값");
});

test("parseResult: 상대/점수(우리 기준)/득점 줄", () => {
  assert.deepEqual(parseResult("⚪15라운드 경기결과🔵\n\n서울은평덴포스 7 : 5 전주시민풋살구단\n\n백승하 전반 5, 후반 6, 14\n윤창욱 전반 11\n\n#서울은평덴포스 #경기결과"), {
    opponent: "전주시민풋살구단",
    scoreUs: 7,
    scoreThem: 5,
    scorerLines: ["백승하 전반 5, 후반 6, 14", "윤창욱 전반 11"],
  });
  assert.deepEqual(parseResult("⚪플레이오프 경기결과🔵\n\n화성FS 4 : 3 서울은평덴포스\n\n백승하 전반 '18\nO.G 후반 '6"), {
    opponent: "화성FS",
    scoreUs: 3,
    scoreThem: 4,
    scorerLines: ["백승하 전반 '18", "O.G 후반 '6"],
  });
  assert.deepEqual(parseResult("⚪경기결과🔵\n아쉽게 졌습니다"), { opponent: null, scoreUs: null, scoreThem: null, scorerLines: [] });
});

test("knownCodes: 포스팅 주소에서 게시물 코드", () => {
  const codes = knownCodes(["https://www.instagram.com/p/DerArQ-TWEJ/", "https://www.instagram.com/reel/DRi-nM8laES/", "https://blog.naver.com/x/1"]);
  assert.deepEqual([...codes], ["DerArQ-TWEJ", "DRi-nM8laES"]);
});

test("kickoffTime: 24시간/오전/오후, 표시 없이 이른 시간은 모름", async () => {
  const { kickoffTime } = await import("../supabase/functions/instagram-sync/embed.ts");
  assert.equal(kickoffTime("🕑 13:00"), "13:00");
  assert.equal(kickoffTime("🕑14:00시"), "14:00");
  assert.equal(kickoffTime("🕑 오후 2:00"), "14:00");
  assert.equal(kickoffTime("🕑 2:30 PM"), "14:30");
  assert.equal(kickoffTime("🕑 오전 10:00"), "10:00");
  assert.equal(kickoffTime("🕑 2:00"), null, "표시 없는 새벽 시간");
  assert.equal(kickoffTime("🕑 시간 미정"), null);
});

test("parseMatchday/parseResult: 줄인 구단 이름도 우리 팀, 양쪽 다 우리/아니면 상대 모름", () => {
  assert.equal(parseMatchday("MATCH DAY\n15라운드\n🆚 은평덴포스 vs 화성FS\n🕑 13:00").opponent, "화성FS");
  assert.equal(parseMatchday("MATCH DAY\n15라운드\n🆚 덴포스 vs 화성FS\n🕑 13:00").opponent, "화성FS");
  assert.equal(parseMatchday("MATCH DAY\n15라운드\n🆚 고양불스 vs 화성FS\n🕑 13:00").opponent, null);
  assert.equal(parseResult("경기결과\n은평덴포스 2 : 1 화성FS\n백승하 전반 3").opponent, "화성FS");
});

test("knownCodes: 계정 이름이 낀 주소도", () => {
  assert.deepEqual([...knownCodes(["https://www.instagram.com/eunpyeong_denforce/p/DerArQ-TWEJ/"])], ["DerArQ-TWEJ"]);
});
