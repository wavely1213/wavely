// URL 파라미터 검증
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import type { NewsCategory } from "@/types";

export const NEWS_CATEGORIES = Object.keys(NEWS_CATEGORY_LABEL) as NewsCategory[];

export function toNewsCategory(value: string): NewsCategory | null {
  return (NEWS_CATEGORIES as string[]).includes(value) ? (value as NewsCategory) : null;
}
