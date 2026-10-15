import Image from "next/image";
import Link from "next/link";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
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
          <Image src={post.thumbnail} alt="" fill sizes="(max-width: 720px) 80vw, 300px" />
        ) : (
          <EmblemFallback />
        )}
      </div>
      <span className={styles.category}>{NEWS_CATEGORY_LABEL[post.category]}</span>
      <strong className={styles.title}>{post.title}</strong>
      {post.date && <span className={styles.date}>{formatPostDate(post.date)}</span>}
    </Link>
  );
}

/** scroll: 모바일에서 한 줄 가로 스와이프 (메인용) */
export function NewsGrid({ posts, scroll = false }: { posts: NewsPost[]; scroll?: boolean }) {
  return (
    <div className={`${styles.grid} ${scroll ? styles.scroll : ""}`}>
      {posts.map((p) => (
        <NewsCard key={p.id} post={p} />
      ))}
    </div>
  );
}
