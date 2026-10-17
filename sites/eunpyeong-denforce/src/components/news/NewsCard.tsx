import Link from "next/link";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
import { FitImage } from "@/components/ui/FitImage";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { formatPostDate } from "@/lib/format";
import type { NewsPost } from "@/types";
import styles from "./NewsCard.module.css";

export function newsHref(post: NewsPost) {
  return `/news/${post.category}/${post.id}`;
}

export function NewsCard({ post }: { post: NewsPost }) {
  return (
    <Link href={newsHref(post)} className={styles.card}>
      <div className={styles.thumb}>
        {post.thumbnail ? (
          // 세로 포스터도 잘리지 않게 (제목 글자·머리) — 가로 사진은 꽉 채운다
          <FitImage src={post.thumbnail} sizes="(max-width: 720px) 80vw, 300px" className={styles.media} />
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

/** scroll: 모바일에서 한 줄 가로 스와이프 (메인용) */
export function NewsGrid({ posts, scroll = false, columns = 4 }: { posts: NewsPost[]; scroll?: boolean; columns?: 3 | 4 }) {
  return (
    <div className={`${styles.grid} ${columns === 3 ? styles.cols3 : ""} ${scroll ? styles.scroll : ""}`}>
      {posts.map((p) => (
        <NewsCard key={p.id} post={p} />
      ))}
    </div>
  );
}
