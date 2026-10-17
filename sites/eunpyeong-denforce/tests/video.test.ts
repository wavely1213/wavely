// 구단영상 주소 해석 단위 테스트 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { embedSrc, parseVideoUrl, watchUrl } from "../src/lib/video.ts";

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

test("embedSrc/watchUrl", () => {
  const yt = parseVideoUrl("https://youtu.be/afzXn77Ws3Y")!;
  assert.equal(embedSrc(yt), "https://www.youtube-nocookie.com/embed/afzXn77Ws3Y?rel=0");
  assert.equal(watchUrl(yt), "https://www.youtube.com/watch?v=afzXn77Ws3Y");
  assert.equal(watchUrl(parseVideoUrl("https://www.youtube.com/shorts/afzXn77Ws3Y")!), "https://www.youtube.com/shorts/afzXn77Ws3Y");
  const ig = parseVideoUrl("https://www.instagram.com/reel/DWlRVxrjznK/")!;
  assert.equal(embedSrc(ig), "https://www.instagram.com/p/DWlRVxrjznK/embed/");
  assert.equal(watchUrl(ig), "https://www.instagram.com/p/DWlRVxrjznK/");
});
