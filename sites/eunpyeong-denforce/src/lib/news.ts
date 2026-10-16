// 구단소식 도우미 — 메인 배너 고르기(D-035), 엠블럼·유니폼 페이지 바로가기 (순수 함수, 테스트: news.test.ts)
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

/** 가장 최근 글 (날짜 문자열 비교 — YYYY-MM-DD·YYYY 모두 앞자리부터 비교된다) */
function latest(posts: NewsPost[], match: (p: NewsPost) => boolean): NewsPost | undefined {
  return posts.filter(match).sort((a, b) => b.date.localeCompare(a.date))[0];
}

/**
 * 엠블럼·유니폼 페이지의 바로가기 — 가장 최근 유니폼 공개 글(뉴스)과 유니폼 구매 안내 글(공지사항, BR-021).
 * 글 id 를 코드에 박지 않고 제목으로 찾는다 — 글을 지우거나 새로 올려도 깨진 링크가 남지 않게. 없으면 undefined (링크 숨김)
 */
export function kitLinks(posts: NewsPost[]): { reveal?: NewsPost; purchase?: NewsPost } {
  return {
    reveal: latest(posts, (p) => p.category === "news" && /KIT 공개|유니폼 공개/i.test(p.title)),
    purchase: latest(posts, (p) => p.category === "notice" && /유니폼 구매/.test(p.title)),
  };
}
