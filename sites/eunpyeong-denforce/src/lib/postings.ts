// 포스팅 목록 도우미 — 정렬·분류 필터·개수 (순수 함수, 테스트: postings.test.ts, D-022)
import type { Posting, PostingKind, PostingPlatform } from "@/types";

export const POSTING_KINDS: readonly PostingKind[] = ["club", "news", "fan", "league"];
export const POSTING_PLATFORMS: readonly PostingPlatform[] = ["naver_blog", "naver_cafe", "article", "youtube", "instagram", "web"];

/** 한 번에 보여 줄 카드 수 ('더 보기'로 이만큼씩 늘린다) */
export const POSTINGS_PAGE_SIZE = 24;

/**
 * 일괄 적재 때 640×480 으로 줄여 둔 대표 사진(media/postings/<url 해시 16자>.jpg)인지.
 * 이 사진은 이미지 최적화를 거치지 않고 바로 받는다 — 관리자가 올린 원본(postings/<uuid>.<ext>)은 최적화 (D-022)
 */
export function isPreshrunkThumbnail(url: string): boolean {
  return /\/media\/postings\/[0-9a-f]{16}\.jpg$/.test(url);
}

/** 최근 글 먼저, 같은 날이면 제목 가나다순 (순서 고정) */
export function byPostedDesc(a: Posting, b: Posting): number {
  return b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "ko");
}

export type PostingFilter = { kind: PostingKind | null; platform: PostingPlatform | null };

/** '전체' 탭에 넣지 않는 분류 — FK리그(한국풋살연맹 영상)는 자기 탭에서만 보인다 (D-032, 소유자 지시) */
export const KINDS_OUTSIDE_ALL: readonly PostingKind[] = ["league"];
const inAll = (p: Posting) => !KINDS_OUTSIDE_ALL.includes(p.kind);

/** kind null 은 '전체'(FK리그 제외) */
export function filterPostings(list: Posting[], { kind, platform }: PostingFilter): Posting[] {
  return list.filter((p) => (kind ? p.kind === kind : inAll(p)) && (!platform || p.platform === platform));
}

/** 분류 탭 개수 — all 은 '전체' 탭(FK리그 제외) */
export function countByKind(list: Posting[]): Record<PostingKind | "all", number> {
  const counts = { all: 0, club: 0, news: 0, fan: 0, league: 0 };
  for (const p of list) {
    counts[p.kind] += 1;
    if (inAll(p)) counts.all += 1;
  }
  return counts;
}

/** 고른 분류 안의 출처별 개수 — 글이 있는 출처만, 많은 순 (같으면 POSTING_PLATFORMS 순) */
export function platformCounts(list: Posting[], kind: PostingKind | null): Array<{ platform: PostingPlatform; count: number }> {
  const scoped = filterPostings(list, { kind, platform: null });
  return POSTING_PLATFORMS.map((platform) => ({ platform, count: scoped.filter((p) => p.platform === platform).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || POSTING_PLATFORMS.indexOf(a.platform) - POSTING_PLATFORMS.indexOf(b.platform));
}
