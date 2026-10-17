import Link from "next/link";
import type { CSSProperties } from "react";
import type { ContentItem } from "@/lib/content/lists";
import { isExternalLink } from "@/lib/content/values";
import styles from "./QuickLinks.module.css";

/** 한 줄에 놓는 카드 수 상한 — 카드가 더 많으면 다음 줄로 */
const MAX_COLUMNS = 5;

/**
 * 메인 맨 아래 바로가기 카드 — 관리자 › 홈페이지 내용 › 메인 '메인 바로가기 카드' (D-046). 바깥 사이트는 새 창.
 * 카드 수에 맞춰 칸 수를 정하고(최대 5), 같은 줄의 두 번째 카드부터 왼쪽 구분선을 긋는다.
 */
export function QuickLinks({ items }: { items: ContentItem[] }) {
  const columns = Math.min(items.length, MAX_COLUMNS);
  return (
    <ul className={styles.list} style={{ "--cols": columns } as CSSProperties}>
      {items.map((l, i) => {
        const text = (
          <span className={styles.text}>
            <strong>{l.title}</strong>
            {l.body && <span>{l.body}</span>}
          </span>
        );
        const className = `${styles.item} ${i % columns !== 0 ? styles.divided : ""}`;
        return (
          <li key={l.id}>
            {isExternalLink(l.link) ? (
              <a href={l.link} target="_blank" rel="noopener noreferrer" className={className}>
                {text}
                <span className="sr-only">(새 창)</span>
              </a>
            ) : (
              <Link href={l.link} className={className}>
                {text}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
