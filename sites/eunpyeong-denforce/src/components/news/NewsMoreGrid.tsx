"use client";

import { useEffect, useRef, useState } from "react";
import { MoreButton } from "@/components/ui/MoreButton";
import { NEWS_PAGE_SIZE, VIDEO_PAGE_SIZE } from "@/lib/news";
import { NewsGrid, type NewsCardPost } from "./NewsCard";

/**
 * 구단소식 목록 — 처음 NEWS_PAGE_SIZE 개, '더 보기'를 누를 때마다 같은 수만큼 더 (포스팅 목록과 같은 버튼).
 * 더 보인 첫 글로 키보드 초점을 옮긴다 (마지막에 버튼이 사라져도 초점이 길을 잃지 않게).
 * vertical: 구단영상 탭 세로 카드 (D-061) — 한 번에 VIDEO_PAGE_SIZE 개
 */
export function NewsMoreGrid({ posts, vertical = false }: { posts: NewsCardPost[]; vertical?: boolean }) {
  const pageSize = vertical ? VIDEO_PAGE_SIZE : NEWS_PAGE_SIZE;
  const [limit, setLimit] = useState(pageSize);
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
    setLimit(limit + pageSize);
  };

  return (
    <>
      <div ref={wrap}>
        <NewsGrid posts={posts.slice(0, limit)} vertical={vertical} />
      </div>
      {posts.length > limit && <MoreButton remaining={posts.length - limit} onClick={showMore} />}
    </>
  );
}
