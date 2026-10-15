import Image from "next/image";
import Link from "next/link";
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
          <Image src={post.thumbnail} alt="" fill sizes="(max-width: 720px) 100vw, 33vw" />
        ) : (
          <span className={styles.noThumb}>{NEWS_CATEGORY_LABEL[post.category]}</span>
        )}
      </div>
      <div className={styles.body}>
        <span className={styles.category}>{NEWS_CATEGORY_LABEL[post.category]}</span>
        <strong className={styles.title}>{post.title}</strong>
        <span className={styles.date}>{formatPostDate(post.date)}</span>
      </div>
    </Link>
  );
}

export function NewsGrid({ posts }: { posts: NewsPost[] }) {
  return (
    <div className={styles.grid}>
      {posts.map((p) => (
        <NewsCard key={p.id} post={p} />
      ))}
    </div>
  );
}
