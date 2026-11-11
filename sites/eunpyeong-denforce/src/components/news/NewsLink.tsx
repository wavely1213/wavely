import Link from "next/link";
import type { ReactNode } from "react";
import { videoCardPlay } from "@/lib/video";
import type { NewsPost } from "@/types";

/** 소식 상세 주소 */
export function newsHref(post: Pick<NewsPost, "id" | "category">) {
  return `/news/${post.category}/${post.id}`;
}

/**
 * 소식 카드 링크 — 구단영상 분류(videoUrl 을 읽을 수 있으면)는 사이트 상세가 아니라 원본(인스타그램, 유튜브)을 새 창으로 연다 (D-074).
 * 화면 읽기에는 '인스타그램에서 재생, 새 창' 을 덧붙인다. 그 밖의 글은 상세로.
 */
export function NewsLink({
  post,
  className,
  tabIndex,
  children,
}: {
  post: Pick<NewsPost, "id" | "category" | "videoUrl">;
  className?: string;
  tabIndex?: number;
  children: ReactNode;
}) {
  const play = videoCardPlay(post);
  if (!play) {
    return (
      <Link href={newsHref(post)} className={className} tabIndex={tabIndex}>
        {children}
      </Link>
    );
  }
  return (
    <a href={play.href} target="_blank" rel="noopener noreferrer" className={className} tabIndex={tabIndex}>
      {children}
      <span className="sr-only"> ({play.label}, 새 창)</span>
    </a>
  );
}
