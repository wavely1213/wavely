"use client";

import { useEffect, useRef, useState } from "react";
import { MoreButton } from "@/components/ui/MoreButton";
import { NEWS_PAGE_SIZE } from "@/lib/news";
import { NewsGrid, type NewsCardPost } from "./NewsCard";

/**
 * 구단소식 목록 — 처음 NEWS_PAGE_SIZE 개, '더 보기'를 누를 때마다 같은 수만큼 더 (포스팅 목록과 같은 버튼).
 * 더 보인 첫 글로 키보드 초점을 옮긴다 (마지막에 버튼이 사라져도 초점이 길을 잃지 않게).
 */
export function NewsMoreGrid({ posts }: { posts: NewsCardPost[] }) {
  const [limit, setLimit] = useState(NEWS_PAGE_SIZE);
  const wrap = useRef<HTMLDivElement>(null);
  const focusAt = useRef<number | null>(null);

  useEffect(() => {
    const i = focusAt.current;
    if (i === null) return;
    focusAt.current = null;
    // 카드 하나 = 링크 하나 (NewsCard)
    wrap.current?.querySelectorAll<HTMLElement>("a")[i]?.focus();
  }, [limit]);

  const showMore = () => {
    focusAt.current = limit;
    setLimit(limit + NEWS_PAGE_SIZE);
  };

  return (
    <>
      <div ref={wrap}>
        <NewsGrid posts={posts.slice(0, limit)} />
      </div>
      {posts.length > limit && <MoreButton remaining={posts.length - limit} onClick={showMore} />}
    </>
  );
}
