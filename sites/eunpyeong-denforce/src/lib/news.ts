// 구단소식 도우미 — 메인 배너 고르기 (순수 함수, 테스트: news.test.ts, D-035)
import type { NewsPost } from "@/types";

/** 메인 배너 최대 장수 */
export const BANNER_MAX = 5;

/** 이적·작별 소식 — 메인 배너에서 뺀다 (소유자 지시 "누가 나갔다라는 이적 내용은 제외") */
const DEPARTURE = /이적으로|동행 마무리|작별|GOOD ?LUCK|THANK ?YOU/i;
export function isDeparture(post: Pick<NewsPost, "title">): boolean {
  return DEPARTURE.test(post.title);
}

/**
 * 구단소식 맨 위 슬라이드 배너 글. posts 는 최근 글 먼저.
 * 관리자가 '메인 배너'로 고정한 글이 있으면 그 글들만, 없으면 사진 있는 최근 글(이적·작별 제외)에서 자동.
 */
export function pickBanner(posts: NewsPost[], max = BANNER_MAX): NewsPost[] {
  const withImage = posts.filter((p) => p.thumbnail);
  const pinned = withImage.filter((p) => p.featured);
  return (pinned.length > 0 ? pinned : withImage.filter((p) => !isDeparture(p))).slice(0, max);
}
