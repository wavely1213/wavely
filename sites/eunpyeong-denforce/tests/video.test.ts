// 구단영상 주소 해석 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { externalPlay, parseVideoUrl, videoCardPlay, watchUrl } from "../src/lib/video.ts";

test("parseVideoUrl: 유튜브 watch/youtu.be/shorts/embed", () => {
  assert.deepEqual(parseVideoUrl("https://www.youtube.com/watch?v=afzXn77Ws3Y&t=10"), { provider: "youtube", id: "afzXn77Ws3Y", vertical: false });
  assert.deepEqual(parseVideoUrl("https://youtu.be/afzXn77Ws3Y"), { provider: "youtube", id: "afzXn77Ws3Y", vertical: false });
  assert.deepEqual(parseVideoUrl("https://m.youtube.com/shorts/afzXn77Ws3Y"), { provider: "youtube", id: "afzXn77Ws3Y", vertical: true });
  assert.deepEqual(parseVideoUrl("https://www.youtube-nocookie.com/embed/afzXn77Ws3Y"), { provider: "youtube", id: "afzXn77Ws3Y", vertical: false });
});

test("parseVideoUrl: 인스타그램 p/reel (계정 경로 포함)", () => {
  assert.deepEqual(parseVideoUrl("https://www.instagram.com/reel/DWlRVxrjznK/"), { provider: "instagram", code: "DWlRVxrjznK", vertical: true });
  assert.deepEqual(parseVideoUrl("https://www.instagram.com/eunpyeong_denforce/p/DWlRVxrjznK/?img_index=1"), { provider: "instagram", code: "DWlRVxrjznK", vertical: true });
});

test("parseVideoUrl: 그 밖의 주소/http/잘못된 아이디는 null", () => {
  for (const bad of [null, "", "not a url", "http://www.youtube.com/watch?v=afzXn77Ws3Y", "https://www.youtube.com/watch?v=short", "https://vimeo.com/123", "https://www.youtube.com/@fs2262", "https://www.instagram.com/eunpyeong_denforce/"]) {
    assert.equal(parseVideoUrl(bad), null, String(bad));
  }
});

test("watchUrl", () => {
  const yt = parseVideoUrl("https://youtu.be/afzXn77Ws3Y")!;
  assert.equal(watchUrl(yt), "https://www.youtube.com/watch?v=afzXn77Ws3Y");
  assert.equal(watchUrl(parseVideoUrl("https://www.youtube.com/shorts/afzXn77Ws3Y")!), "https://www.youtube.com/shorts/afzXn77Ws3Y");
  const ig = parseVideoUrl("https://www.instagram.com/reel/DWlRVxrjznK/")!;
  assert.equal(watchUrl(ig), "https://www.instagram.com/p/DWlRVxrjznK/");
});

test("externalPlay: 원본 재생 주소와 이름, 못 읽으면 null (D-074)", () => {
  assert.deepEqual(externalPlay("https://www.instagram.com/reel/DWlRVxrjznK/"), { href: "https://www.instagram.com/p/DWlRVxrjznK/", label: "인스타그램에서 재생" });
  assert.deepEqual(externalPlay("https://youtu.be/afzXn77Ws3Y"), { href: "https://www.youtube.com/watch?v=afzXn77Ws3Y", label: "유튜브에서 재생" });
  assert.equal(externalPlay(null), null);
  assert.equal(externalPlay("https://example.com/v.mp4"), null);
});

test("videoCardPlay: 구단영상 분류만 원본으로, 공지/구단뉴스는 영상 주소가 있어도 상세 (D-074)", () => {
  const reel = "https://www.instagram.com/reel/DWlRVxrjznK/";
  assert.equal(videoCardPlay({ category: "video", videoUrl: reel })?.href, "https://www.instagram.com/p/DWlRVxrjznK/");
  assert.equal(videoCardPlay({ category: "notice", videoUrl: reel }), null);
  assert.equal(videoCardPlay({ category: "news", videoUrl: reel }), null);
  assert.equal(videoCardPlay({ category: "video", videoUrl: null }), null);
});
