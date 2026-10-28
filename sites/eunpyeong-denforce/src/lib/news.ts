// 구단소식 도우미 — 메인 배너 고르기(D-035), 이전/다음 글, 엠블럼·유니폼 페이지 바로가기 (순수 함수, 테스트: news.test.ts)
import type { NewsPost } from "@/types";

/** 메인 배너 최대 장수 */
export const BANNER_MAX = 5;

/** 구단소식 목록 처음에 보이는 글 수 — '더 보기'를 누를 때마다 이만큼 더 */
export const NEWS_PAGE_SIZE = 12;
/** 구단영상 탭(세로 카드 — PC 5칸, 태블릿 4칸, 휴대폰 2칸)은 한 번에 20개 — 어느 화면에서도 줄이 꽉 찬다 (D-061) */
export const VIDEO_PAGE_SIZE = 20;

/**
 * 글 상세 아래 '이전 글 / 다음 글'. posts 는 같은 분류 글, 최근 글 먼저(목록 순서).
 * 이전 글 = 바로 전에 올라온 글(목록에서 한 칸 아래), 다음 글 = 바로 뒤에 올라온 글(한 칸 위). 없으면 undefined
 */
export function adjacentPosts<T extends { id: string }>(posts: T[], id: string): { older?: T; newer?: T } {
  const i = posts.findIndex((p) => p.id === id);
  if (i < 0) return {};
  return { older: posts[i + 1], newer: i > 0 ? posts[i - 1] : undefined };
}

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
 * 엠블럼·유니폼 페이지의 바로가기 — 가장 최근 유니폼 공개 글(뉴스).
 * 글 id 를 코드에 박지 않고 제목으로 찾는다 — 글을 지우거나 새로 올려도 깨진 링크가 남지 않게. 없으면 undefined (버튼 숨김)
 * ('유니폼 구매 안내' 버튼은 소유자 지시로 내렸다 — D-041)
 */
export function kitLinks(posts: NewsPost[]): { reveal?: NewsPost } {
  return { reveal: latest(posts, (p) => p.category === "news" && /KIT 공개|유니폼 공개/i.test(p.title)) };
}
