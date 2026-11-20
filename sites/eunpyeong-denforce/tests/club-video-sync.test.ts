// 구단 유튜브 롱폼 → 구단영상 (D-101) 순수 함수 — 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isClubVideo,
  LONGFORM_PLAYLIST,
  longformUnavailable,
  MAX_SHORTS_CHECKS,
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
  // 최신 먼저 확인
  assert.deepEqual(first.needShortsCheck.map((v) => v.videoId), ["unknown0001", "shorts00001", "longform001"]);
  const shorts = new Map<string, boolean | null>([["longform001", false], ["shorts00001", true], ["unknown0001", null]]);
  const second = planClubVideos({ videos, applied: new Set(), existing: new Map(), fromUploads: true, shorts });
  assert.deepEqual(second.inserts.map((i) => i.video.videoId), ["longform001"]);
  assert.deepEqual(second.shorts.map((v) => v.videoId), ["shorts00001"]);
  assert.deepEqual(second.notes, ["쇼츠라 뺌: 은평 쇼츠", "쇼츠인지 확인 못 함(다음 실행에 다시): 은평 모름"]);
});

/** index.ts 한 실행과 같은 순서 — 계획 → 최신 MAX 개 쇼츠 확인 → 다시 계획 → 넣은 것/기록/쇼츠를 applied 에 반영 */
function simulateRun(videos: ClubVideo[], applied: Set<string>, isShort: (id: string) => boolean | null) {
  let plan = planClubVideos({ videos, applied, existing: new Map(), fromUploads: true });
  const checked: string[] = [];
  if (plan.needShortsCheck.length) {
    const shorts = new Map<string, boolean | null>();
    for (const v of plan.needShortsCheck.slice(0, MAX_SHORTS_CHECKS)) {
      checked.push(v.videoId);
      shorts.set(v.videoId, isShort(v.videoId));
    }
    plan = planClubVideos({ videos, applied, existing: new Map(), fromUploads: true, shorts });
  }
  for (const i of plan.inserts) applied.add(i.video.videoId);
  for (const r of plan.record) applied.add(r.video.videoId);
  for (const v of plan.shorts) applied.add(v.videoId);
  return { inserted: plan.inserts.map((i) => i.video.videoId), checked, deferred: plan.needShortsCheck.length };
}

test("업로드 전체 경로: 오래된 '은평' 쇼츠가 확인 수보다 많아도 새 롱폼이 밀리지 않고, 쇼츠는 다시 확인하지 않는다 (총괄 검토)", () => {
  const shorts = Array.from({ length: 12 }, (_, i) => V(`oldshort${String(i).padStart(3, "0")}`, `은평 쇼츠 ${i}`, `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00Z`));
  const longform = V("newlongform", "은평 새 롱폼", "2026-11-19T00:00:00Z");
  const videos = [...shorts, longform];
  const applied = new Set<string>();
  const isShort = (id: string) => id.startsWith("oldshort");
  const run1 = simulateRun(videos, applied, isShort);
  assert.deepEqual(run1.inserted, ["newlongform"]); // 최신 먼저 확인하니 1회차에 들어간다
  assert.equal(run1.checked.length, MAX_SHORTS_CHECKS);
  assert.equal(run1.checked[0], "newlongform");
  const run2 = simulateRun(videos, applied, isShort);
  assert.deepEqual(run2.inserted, []);
  // 1회차에 쇼츠로 판정한 9개는 다시 확인하지 않고, 남은 3개만 확인
  assert.equal(run2.checked.length, 3);
  const run3 = simulateRun(videos, applied, isShort);
  assert.deepEqual(run3, { inserted: [], checked: [], deferred: 0 });
});

test("planClubVideos: 썸네일 없으면 넣되 메모, 같은 영상 두 번이면 한 번", () => {
  const noThumb = { ...V("nothumb0001", "은평 썸네일 없음", "2026-11-19T00:00:00Z"), thumbnail: null };
  const p = planClubVideos({ videos: [noThumb, noThumb], applied: new Set(), existing: new Map(), fromUploads: false });
  assert.equal(p.inserts.length, 1);
  assert.equal(p.inserts[0].draft.thumbnail_url, null);
  assert.deepEqual(p.notes, ["16:9 썸네일 없음(대체 표지): 은평 썸네일 없음"]);
});

test("appliedForPlan: 롱폼 목록 실행에서는 'short' 기록을 빼고 본다 — 쇼츠 오판이 영구화되지 않게 (총괄 검토)", async () => {
  const { appliedForPlan } = await import("../supabase/functions/club-video-sync/plan.ts");
  const rows = [
    { video_id: "iz7zWU3TrvA", kind: "short" },
    { video_id: "deleted0001", kind: "inserted" },
    { video_id: "manual00001", kind: "existing" },
  ];
  assert.deepEqual([...appliedForPlan(rows, "longform")].sort(), ["deleted0001", "manual00001"]);
  assert.deepEqual([...appliedForPlan(rows, "uploads")].sort(), ["deleted0001", "iz7zWU3TrvA", "manual00001"]);
  // UULF 경로: 잘못 쇼츠로 기록된 롱폼도 들어간다
  const p = planClubVideos({ videos: [V("iz7zWU3TrvA", EP01, "2026-11-19T00:00:00Z")], applied: appliedForPlan(rows, "longform"), existing: new Map(), fromUploads: false });
  assert.deepEqual(p.inserts.map((i) => i.video.videoId), ["iz7zWU3TrvA"]);
});

test("videoIdsOf / videoUrlFilter: 이번 실행 영상만 읽는 조회 모양 (1000줄 상한 피함)", async () => {
  const { videoIdsOf, videoUrlFilter } = await import("../supabase/functions/club-video-sync/plan.ts");
  const ids = videoIdsOf([V("iz7zWU3TrvA", "a", "2026-11-19T00:00:00Z"), V("iz7zWU3TrvA", "a", "2026-11-19T00:00:00Z"), V("-sygnpfOfYU", "b", "2026-11-18T00:00:00Z")]);
  assert.deepEqual(ids, ["iz7zWU3TrvA", "-sygnpfOfYU"]);
  assert.equal(videoUrlFilter(ids), "video_url.ilike.*iz7zWU3TrvA*,video_url.ilike.*-sygnpfOfYU*");
});
