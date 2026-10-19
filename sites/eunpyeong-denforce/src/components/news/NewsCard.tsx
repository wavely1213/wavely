import Link from "next/link";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
import { FitImage } from "@/components/ui/FitImage";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { formatPostDate } from "@/lib/format";
import type { NewsPost } from "@/types";
import styles from "./NewsCard.module.css";

/** 목록 카드에 쓰는 칸만 — 클라이언트 목록(더 보기)으로 넘길 때 본문까지 보내지 않게 */
export type NewsCardPost = Pick<NewsPost, "id" | "category" | "title" | "date" | "thumbnail" | "videoUrl">;

export function toNewsCardPost({ id, category, title, date, thumbnail, videoUrl }: NewsPost): NewsCardPost {
  return { id, category, title, date, thumbnail, videoUrl };
}

export function newsHref(post: Pick<NewsPost, "id" | "category">) {
  return `/news/${post.category}/${post.id}`;
}

export function NewsCard({ post, sizes = "(max-width: 720px) 80vw, 300px" }: { post: NewsCardPost; sizes?: string }) {
  return (
    <Link href={newsHref(post)} className={styles.card}>
      <div className={styles.thumb}>
        {post.thumbnail ? (
          // 세로 포스터도 잘리지 않게 (제목 글자·머리) — 가로 사진은 꽉 채운다
          <FitImage src={post.thumbnail} sizes={sizes} className={styles.media} />
        ) : (
          <EmblemFallback />
        )}
        {post.videoUrl && (
          <span className={styles.play} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M8 5v14l11-7z" fill="currentColor" />
            </svg>
          </span>
        )}
      </div>
      <span className={styles.category}>{NEWS_CATEGORY_LABEL[post.category]}</span>
      <strong className={styles.title}>
        {post.title}
        {post.videoUrl && <span className="sr-only"> (영상)</span>}
      </strong>
      {post.date && <span className={styles.date}>{formatPostDate(post.date)}</span>}
    </Link>
  );
}

/**
 * scroll: 모바일에서 한 줄 가로 스와이프 (메인용)
 * vertical: 세로 영상(릴스) 카드를 한 줄에 여럿 — PC 5칸, 태블릿 4칸, 휴대폰 2칸 (구단영상 탭, D-061)
 */
export function NewsGrid({
  posts,
  scroll = false,
  columns = 4,
  vertical = false,
}: {
  posts: NewsCardPost[];
  scroll?: boolean;
  columns?: 3 | 4;
  vertical?: boolean;
}) {
  return (
    <div className={`${styles.grid} ${columns === 3 ? styles.cols3 : ""} ${scroll ? styles.scroll : ""} ${vertical ? styles.vertical : ""}`}>
      {posts.map((p) => (
        <NewsCard key={p.id} post={p} sizes={vertical ? "(max-width: 720px) 50vw, 240px" : undefined} />
      ))}
    </div>
  );
}
