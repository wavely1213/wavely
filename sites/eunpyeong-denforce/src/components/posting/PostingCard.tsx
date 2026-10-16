import Image from "next/image";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
import { POSTING_PLATFORM_LABEL } from "@/data/postings";
import { formatPostDate } from "@/lib/format";
import type { Posting } from "@/types";
import styles from "./PostingCard.module.css";

/** 바깥 글 카드 — 누르면 원문을 새 창으로 연다. 구단 포스팅은 출처 배지를 어둡게 구분 */
export function PostingCard({ posting }: { posting: Posting }) {
  return (
    <a href={posting.url} target="_blank" rel="noopener noreferrer" className={styles.card}>
      <div className={styles.thumb}>
        {posting.thumbnail ? (
          // 대표 사진은 적재 때 640×480 으로 줄여 두었다 — 수백 장이라 Vercel 이미지 최적화(무료 한도)를 거치지 않고 Storage 에서 바로 받는다 (D-022)
          <Image src={posting.thumbnail} alt="" fill unoptimized loading="lazy" />
        ) : (
          <EmblemFallback />
        )}
        <span className={`${styles.badge} ${posting.kind === "club" ? styles.badgeClub : ""}`}>
          {POSTING_PLATFORM_LABEL[posting.platform]}
        </span>
      </div>
      <strong className={styles.title}>
        {posting.title}
        <span className="sr-only"> (새 창)</span>
      </strong>
      <span className={styles.meta}>
        <span className={styles.author}>{posting.author}</span>
        <span className={styles.date}>{formatPostDate(posting.date)}</span>
      </span>
    </a>
  );
}
