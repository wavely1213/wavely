// 구단 유튜브 롱폼 → 구단영상 자동 반영 (D-101) — 순수 함수. Deno/Node 둘 다에서 돈다 (테스트: club-video-sync.test.ts)
// 채널 '덴포스 DENFORCE SPORTS'(@덴포스DENFORCESPORTS)의 롱폼(쇼츠 제외) 중 제목에 '은평'이 든 영상만 (소유자 2026-11-20).
// 롱폼 목록: 업로드 재생목록의 롱폼 전용 묶음 UULF…(웹 확인: UULF = 롱폼, UUSH = 쇼츠). Data API 가 UULF 를 받지 않으면
// 업로드 전체 UU… + 쇼츠 주소 확인(https://www.youtube.com/shorts/<id> 가 200 이면 쇼츠)으로 거른다. 길이로 거르지 않는다(1분대 롱폼도 있음).
import { seoulDate, youtubeError } from "../kfl-video-sync/plan.ts";

export { youtubeError };

/** 덴포스 DENFORCE SPORTS */
export const CLUB_CHANNEL_ID = "UC_834SREJnoVt5QTTqL-fuw";
/** 롱폼만 (UC → UULF) */
export const LONGFORM_PLAYLIST = `UULF${CLUB_CHANNEL_ID.slice(2)}`;
/** 업로드 전체 (UC → UU) — 롱폼 목록을 못 읽을 때만 */
export const UPLOADS_PLAYLIST = `UU${CLUB_CHANNEL_ID.slice(2)}`;
export const CHANNEL_LABEL = "덴포스 DENFORCE SPORTS";
const PLAYLIST_API = "https://www.googleapis.com/youtube/v3/playlistItems";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
/** 구단영상에 넣는 영상 — 제목에 '은평' (소유자 규칙. '덴포스'만 있는 신세계 협업 영상 등은 뺀다) */
const OURS = /은평/;

/** 재생목록 한 쪽 주소 (50개). 키는 서버 함수 안에서만 붙인다 */
export function playlistUrl(playlistId: string, apiKey: string, pageToken?: string): string {
  const p = new URLSearchParams({ part: "snippet,contentDetails,status", playlistId, maxResults: "50", key: apiKey });
  if (pageToken) p.set("pageToken", pageToken);
  return `${PLAYLIST_API}?${p}`;
}

/** 쇼츠 확인 주소 — 리다이렉트를 따라가지 않고 받으면 쇼츠는 200, 롱폼은 303(watch 로) */
export const shortsUrl = (videoId: string) => `https://www.youtube.com/shorts/${videoId}`;

/** 쇼츠 확인 응답 → 쇼츠인지. 200 만 쇼츠, 3xx 는 롱폼, 그 밖(오류)은 모름(null) — 모르면 넣지 않고 다음 실행에 다시 */
export function shortsFromStatus(status: number): boolean | null {
  if (status === 200) return true;
  if (status >= 300 && status < 400) return false;
  return null;
}

type Thumb = { url?: string; width?: number; height?: number };
export type Thumbnails = Partial<Record<"default" | "medium" | "high" | "standard" | "maxres", Thumb>>;
type Item = {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    resourceId?: { videoId?: string };
    thumbnails?: Thumbnails;
  };
  contentDetails?: { videoId?: string; videoPublishedAt?: string };
  status?: { privacyStatus?: string };
};

export type ClubVideo = { videoId: string; title: string; published: string; thumbnail: string | null };

/**
 * 썸네일 — 16:9 만: maxres(1280x720) → medium(320x180). high/standard/default 는 4:3(위아래 검정 띠)이라 쓰지 않는다.
 * 둘 다 없으면 null (화면은 대체 표지). i.ytimg.com 주소를 그대로 쓴다(저장소에 올리지 않음 — 송신량, I-072)
 */
export function pickThumbnail(t: Thumbnails | undefined): string | null {
  for (const k of ["maxres", "medium"] as const) {
    const u = t?.[k]?.url;
    if (typeof u === "string" && /^https:\/\/i\d?\.ytimg\.com\//.test(u) && u.length <= 300) return u;
  }
  return null;
}

/** playlistItems 응답 → 영상 목록 + 다음 쪽 토큰. 비공개/삭제/형식이 틀린 항목은 버린다 */
export function parseClubPlaylist(body: unknown): { videos: ClubVideo[]; nextPageToken: string | null } {
  const b = (body ?? {}) as { items?: Item[]; nextPageToken?: string };
  const videos: ClubVideo[] = [];
  for (const it of b.items ?? []) {
    const videoId = (it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId ?? "").trim();
    const title = (it.snippet?.title ?? "").trim();
    const published = (it.contentDetails?.videoPublishedAt ?? it.snippet?.publishedAt ?? "").trim();
    const privacy = it.status?.privacyStatus;
    if (!VIDEO_ID.test(videoId) || !title || /^(Private|Deleted) video$/i.test(title)) continue;
    if (privacy && privacy !== "public") continue;
    if (!Number.isFinite(Date.parse(published))) continue;
    videos.push({ videoId, title, published, thumbnail: pickThumbnail(it.snippet?.thumbnails) });
  }
  return { videos, nextPageToken: typeof b.nextPageToken === "string" && b.nextPageToken ? b.nextPageToken : null };
}

/** 롱폼 목록(UULF)을 Data API 가 받지 않음 → 업로드 전체 + 쇼츠 확인으로 바꾼다 */
export function longformUnavailable(status: number, body: string): boolean {
  return status === 404 || /playlistNotFound|playlistId/i.test(body);
}

export const isClubVideo = (title: string) => OURS.test(title);

/** 구단영상 글 한 줄 (instagram-sync 릴스 → 구단영상과 같은 모양: 요약 비움, 본문 = 출처 한 줄) */
export type VideoNewsDraft = {
  category: "video";
  title: string;
  date: string;
  summary: string;
  body: string;
  images: string[];
  thumbnail_url: string | null;
  video_url: string;
  published: true;
};

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() : s);

export function videoNews(v: ClubVideo): VideoNewsDraft {
  const date = seoulDate(v.published);
  return {
    category: "video",
    title: cut(v.title, 120),
    date,
    summary: "",
    body: `구단 공식 유튜브(${CHANNEL_LABEL}) 영상 (${date})`,
    images: [],
    thumbnail_url: v.thumbnail,
    video_url: `https://www.youtube.com/watch?v=${v.videoId}`,
    published: true,
  };
}

/** news_posts.video_url 속 유튜브 영상 ID (watch, youtu.be, shorts, embed) — 관리자가 손으로 넣은 글과 겹치지 않게 */
export function youtubeIdOf(url: string | null): string | null {
  if (!url) return null;
  const m = /(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/.exec(url);
  return m ? m[1] : null;
}

/** 한 실행에서 쇼츠 확인 요청 수 (업로드 전체를 읽었을 때만) */
export const MAX_SHORTS_CHECKS = 10;

export type ClubPlan = {
  /** 새로 넣을 글 */
  inserts: Array<{ video: ClubVideo; draft: VideoNewsDraft }>;
  /** 이미 사이트에 있는 영상(관리자가 손으로 넣음) — 기록만 남긴다(뒤에 지워도 다시 안 넣게) */
  record: Array<{ video: ClubVideo; newsId: string }>;
  /** 이번에 쇼츠로 판정한 영상 — 기록(kind 'short')해 다음 실행에 다시 확인하지 않는다 */
  shorts: ClubVideo[];
  /** 쇼츠 확인이 필요한 후보 (업로드 전체를 읽었을 때만) — 최신 먼저, 오래된 백로그가 새 업로드를 막지 않게 */
  needShortsCheck: ClubVideo[];
  notes: string[];
};

/**
 * 무엇을 넣을지 — 은평 제목만, 이미 기록된 영상(넣었거나 관리자가 지운 것) 빼고, 사이트에 이미 있는 영상은 기록만.
 * fromUploads: 업로드 전체를 읽었으면 쇼츠 확인 전에는 넣지 않고 needShortsCheck 로 돌린다.
 * shorts: 쇼츠 확인 결과(true 쇼츠, false 롱폼, 없음 = 아직 모름)
 */
export function planClubVideos(input: {
  videos: ClubVideo[];
  applied: Set<string>;
  existing: Map<string, string>;
  fromUploads: boolean;
  shorts?: Map<string, boolean | null>;
}): ClubPlan {
  const out: ClubPlan = { inserts: [], record: [], shorts: [], needShortsCheck: [], notes: [] };
  const seen = new Set<string>();
  // 오래된 것부터 넣어 같은 날 여러 영상의 순서가 게시 순서와 같게
  const list = [...input.videos].sort((a, b) => a.published.localeCompare(b.published));
  for (const v of list) {
    if (seen.has(v.videoId)) continue;
    seen.add(v.videoId);
    if (input.applied.has(v.videoId)) continue;
    if (!isClubVideo(v.title)) continue;
    const newsId = input.existing.get(v.videoId);
    if (newsId) {
      out.record.push({ video: v, newsId });
      continue;
    }
    if (input.fromUploads) {
      const s = input.shorts?.get(v.videoId);
      if (s === undefined) {
        out.needShortsCheck.push(v);
        continue;
      }
      if (s === true) {
        out.shorts.push(v);
        out.notes.push(`쇼츠라 뺌: ${v.title}`);
        continue;
      }
      if (s === null) {
        out.notes.push(`쇼츠인지 확인 못 함(다음 실행에 다시): ${v.title}`);
        continue;
      }
    }
    if (!v.thumbnail) out.notes.push(`16:9 썸네일 없음(대체 표지): ${v.title}`);
    out.inserts.push({ video: v, draft: videoNews(v) });
  }
  out.needShortsCheck.sort((a, b) => b.published.localeCompare(a.published));
  return out;
}
