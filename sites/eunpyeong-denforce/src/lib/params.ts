// URL 파라미터 검증
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import type { NewsCategory } from "@/types";

export const NEWS_CATEGORIES = Object.keys(NEWS_CATEGORY_LABEL) as NewsCategory[];

export function toNewsCategory(value: string): NewsCategory | null {
  return (NEWS_CATEGORIES as string[]).includes(value) ? (value as NewsCategory) : null;
}

/**
 * Cache Components 에서는 generateStaticParams 가 빈 배열이면 빌드 에러다.
 * 데이터가 없을 때는 존재하지 않는 자리표시 값 하나를 돌려주고, 페이지에서 notFound() 로 처리된다.
 */
export function nonEmptyParams<T>(list: T[], placeholder: T): T[] {
  return list.length > 0 ? list : [placeholder];
}
