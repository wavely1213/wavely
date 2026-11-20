// 구단 유튜브 롱폼 → 구단영상 (D-101) 순수 함수 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isClubVideo,
  LONGFORM_PLAYLIST,
  longformUnavailable,
  parseClubPlaylist,
  pickThumbnail,
  planClubVideos,
  playlistUrl,
  shortsFromStatus,
  UPLOADS_PLAYLIST,
  videoNews,
  youtubeIdOf,
  type ClubVideo,
} from "../supabase/functions/club-video-sync/plan.ts";

const EP01 = "EP.01 새로운 시작 | 26/27 FK리그1 1R 서울은평 덴포스 vs 노원제너FS";
const SSG = "DENFORCE × 신세계 | DESIGN YOUR GROUND";

const item = (videoId: string, title: string, published: string, thumbs: Record<string, { url: string }> = {}, privacy = "public") => ({
  snippet: { title, publishedAt: published, resourceId: { videoId }, thumbnails: thumbs },
  contentDetails: { videoId, videoPublishedAt: published },
  status: { privacyStatus: privacy },
});

test("재생목록 ID: 롱폼 UULF, 업로드 UU (채널 UC_834SREJnoVt5QTTqL-fuw)", () => {
  assert.equal(LONGFORM_PLAYLIST, "UULF_834SREJnoVt5QTTqL-fuw");
  assert.equal(UPLOADS_PLAYLIST, "UU_834SREJnoVt5QTTqL-fuw");
  const u = new URL(playlistUrl(LONGFORM_PLAYLIST, "k", "T1"));
  assert.equal(u.searchParams.get("playlistId"), "UULF_834SREJnoVt5QTTqL-fuw");
  assert.equal(u.searchParams.get("pageToken"), "T1");
  assert.equal(u.searchParams.get("maxResults"), "50");
});

test("isClubVideo: 제목에 '은평'만 (소유자 예시 두 개)", () => {
  assert.equal(isClubVideo(EP01), true);
  assert.equal(isClubVideo(SSG), false);
  assert.equal(isClubVideo("덴포스 훈련 브이로그"), false);
});

test("pickThumbnail: maxres → medium (16:9 만), 4:3 high/standard 는 안 씀", () => {
  const yt = (k: string) => ({ url: `https://i.ytimg.com/vi/iz7zWU3TrvA/${k}.jpg` });
  assert.equal(pickThumbnail({ maxres: yt("maxresdefault"), high: yt("hqdefault"), medium: yt("mqdefault") }), "https://i.ytimg.com/vi/iz7zWU3TrvA/maxresdefault.jpg");
  assert.equal(pickThumbnail({ high: yt("hqdefault"), medium: yt("mqdefault") }), "https://i.ytimg.com/vi/iz7zWU3TrvA/mqdefault.jpg");
  assert.equal(pickThumbnail({ high: yt("hqdefault"), standard: yt("sddefault") }), null);
  assert.equal(pickThumbnail({ maxres: { url: "https://evil.example/x.jpg" } }), null);
  assert.equal(pickThumbnail(undefined), null);
});

test("parseClubPlaylist: 비공개/삭제/형식 틀림/날짜 없음은 버린다", () => {
  const r = parseClubPlaylist({
    nextPageToken: "N",
    items: [
      item("iz7zWU3TrvA", EP01, "2026-11-19T10:00:00Z", { maxres: { url: "https://i.ytimg.com/vi/iz7zWU3TrvA/maxresdefault.jpg" } }),
      item("-sygnpfOfYU", SSG, "2026-11-18T10:00:00Z"),
      item("privatevid1", "Private video", "2026-11-18T10:00:00Z"),
      item("unlisted001", "은평 비공개", "2026-11-18T10:00:00Z", {}, "unlisted"),
      item("bad", "은평", "2026-11-18T10:00:00Z"),
      item("nodate00001", "은평 날짜 없음", ""),
    ],
  });
  assert.equal(r.nextPageToken, "N");
  assert.deepEqual(r.videos, [
    { videoId: "iz7zWU3TrvA", title: EP01, published: "2026-11-19T10:00:00Z", thumbnail: "https://i.ytimg.com/vi/iz7zWU3TrvA/maxresdefault.jpg" },
    { videoId: "-sygnpfOfYU", title: SSG, published: "2026-11-18T10:00:00Z", thumbnail: null },
  ]);
  assert.deepEqual(parseClubPlaylist(null), { videos: [], nextPageToken: null });
});

test("videoNews: 구단영상 글 모양 (날짜 = 게시일 서울, watch 주소, 요약 비움)", () => {
  const v: ClubVideo = { videoId: "iz7zWU3TrvA", title: EP01, published: "2026-11-19T16:30:00Z", thumbnail: "https://i.ytimg.com/vi/iz7zWU3TrvA/maxresdefault.jpg" };
  assert.deepEqual(videoNews(v), {
    category: "video",
    title: EP01,
    date: "2026-11-20",
    summary: "",
    body: "구단 공식 유튜브(덴포스 DENFORCE SPORTS) 영상 (2026-11-20)",
    images: [],
    thumbnail_url: "https://i.ytimg.com/vi/iz7zWU3TrvA/maxresdefault.jpg",
    video_url: "https://www.youtube.com/watch?v=iz7zWU3TrvA",
    published: true,
  });
  assert.ok(!JSON.stringify(videoNews(v)).includes("·"));
});

test("youtubeIdOf: watch / youtu.be / shorts / embed, 그 밖 null", () => {
  assert.equal(youtubeIdOf("https://www.youtube.com/watch?v=iz7zWU3TrvA&t=3"), "iz7zWU3TrvA");
  assert.equal(youtubeIdOf("https://youtu.be/iz7zWU3TrvA"), "iz7zWU3TrvA");
  assert.equal(youtubeIdOf("https://www.youtube.com/shorts/iz7zWU3TrvA"), "iz7zWU3TrvA");
  assert.equal(youtubeIdOf("https://www.instagram.com/reel/DfuejQEzCn7/"), null);
  assert.equal(youtubeIdOf(null), null);
});

test("shortsFromStatus / longformUnavailable", () => {
  assert.equal(shortsFromStatus(200), true);
  assert.equal(shortsFromStatus(303), false);
  assert.equal(shortsFromStatus(302), false);
  assert.equal(shortsFromStatus(429), null);
  assert.equal(longformUnavailable(404, ""), true);
  assert.equal(longformUnavailable(400, '{"reason":"playlistNotFound"}'), true);
  assert.equal(longformUnavailable(403, '{"reason":"quotaExceeded"}'), false);
});

const V = (videoId: string, title: string, published: string): ClubVideo => ({ videoId, title, published, thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` });

test("planClubVideos: 은평만, 기록된 영상(넣었거나 관리자가 지움) 빼고, 이미 있는 영상은 기록만, 오래된 것부터", () => {
  const videos = [V("newer000002", "2R 서울은평 덴포스", "2026-11-21T00:00:00Z"), V("iz7zWU3TrvA", EP01, "2026-11-19T00:00:00Z"), V("-sygnpfOfYU", SSG, "2026-11-18T00:00:00Z"), V("deleted0001", "은평 지운 영상", "2026-11-10T00:00:00Z"), V("manual00001", "은평 손으로 넣음", "2026-11-11T00:00:00Z")];
  const p = planClubVideos({ videos, applied: new Set(["deleted0001"]), existing: new Map([["manual00001", "news-1"]]), fromUploads: false });
  assert.deepEqual(p.inserts.map((i) => i.video.videoId), ["iz7zWU3TrvA", "newer000002"]);
  assert.deepEqual(p.record, [{ video: videos[4], newsId: "news-1" }]);
  assert.deepEqual(p.needShortsCheck, []);
  assert.deepEqual(p.notes, []);
});

test("planClubVideos: 업로드 전체를 읽었으면 쇼츠 확인 뒤에만 넣는다", () => {
  const videos = [V("longform001", "은평 롱폼", "2026-11-19T00:00:00Z"), V("shorts00001", "은평 쇼츠", "2026-11-19T01:00:00Z"), V("unknown0001", "은평 모름", "2026-11-19T02:00:00Z")];
  const first = planClubVideos({ videos, applied: new Set(), existing: new Map(), fromUploads: true });
  assert.deepEqual(first.inserts, []);
  assert.deepEqual(first.needShortsCheck.map((v) => v.videoId), ["longform001", "shorts00001", "unknown0001"]);
  const shorts = new Map<string, boolean | null>([["longform001", false], ["shorts00001", true], ["unknown0001", null]]);
  const second = planClubVideos({ videos, applied: new Set(), existing: new Map(), fromUploads: true, shorts });
  assert.deepEqual(second.inserts.map((i) => i.video.videoId), ["longform001"]);
  assert.deepEqual(second.notes, ["쇼츠라 뺌: 은평 쇼츠", "쇼츠인지 확인 못 함(다음 실행에 다시): 은평 모름"]);
});

test("planClubVideos: 썸네일 없으면 넣되 메모, 같은 영상 두 번이면 한 번", () => {
  const noThumb = { ...V("nothumb0001", "은평 썸네일 없음", "2026-11-19T00:00:00Z"), thumbnail: null };
  const p = planClubVideos({ videos: [noThumb, noThumb], applied: new Set(), existing: new Map(), fromUploads: false });
  assert.equal(p.inserts.length, 1);
  assert.equal(p.inserts[0].draft.thumbnail_url, null);
  assert.deepEqual(p.notes, ["16:9 썸네일 없음(대체 표지): 은평 썸네일 없음"]);
});
