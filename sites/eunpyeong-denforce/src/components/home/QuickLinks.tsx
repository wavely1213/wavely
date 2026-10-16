import Link from "next/link";
import type { ContentItem } from "@/lib/content/lists";
import { isExternalLink } from "@/lib/content/values";
import styles from "./QuickLinks.module.css";

/** 메인 맨 아래 바로가기 카드 — 관리자 › 홈페이지 내용 › 메인 '메인 바로가기 카드' (D-046). 바깥 사이트는 새 창 */
export function QuickLinks({ items }: { items: ContentItem[] }) {
  return (
    <ul className={styles.list}>
      {items.map((l) => {
        const text = (
          <span className={styles.text}>
            <strong>{l.title}</strong>
            {l.body && <span>{l.body}</span>}
          </span>
        );
        return (
          <li key={l.id}>
            {isExternalLink(l.link) ? (
              <a href={l.link} target="_blank" rel="noopener noreferrer" className={styles.item}>
                {text}
                <span className="sr-only">(새 창)</span>
              </a>
            ) : (
              <Link href={l.link} className={styles.item}>
                {text}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
