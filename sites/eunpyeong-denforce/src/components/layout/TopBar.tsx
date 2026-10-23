import Link from "next/link";
import { SnsIcon } from "@/components/ui/SnsIcon";
import { StoreIcon } from "@/components/ui/StoreIcon";
import type { SnsLink } from "@/lib/club";
import styles from "./TopBar.module.css";

/**
 * 헤더 위 얇은 띠 — 왼쪽 공식 SNS(관리자 › 구단정보에 넣은 채널만), 오른쪽 MD스토어(D-047)·사이트맵 (D-042, 강원FC 상단 띠 참고).
 * PC 에서만 보인다. 모바일은 메뉴 안에 같은 링크를 둔다 (Header).
 */
export function TopBar({ sns, store }: { sns: SnsLink[]; store: { label: string; href: string } }) {
  return (
    <div className={styles.topBar}>
      <div className={`container ${styles.inner}`}>
        <ul className={styles.sns} aria-label="공식 SNS">
          {sns.map((s) => (
            <li key={s.label}>
              <a href={s.href} target="_blank" rel="noopener noreferrer" className={styles.icon}>
                <SnsIcon name={s.label} />
                <span className="sr-only">{s.label} (새 창)</span>
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.right}>
          <a href={store.href} target="_blank" rel="noopener noreferrer" className={styles.store}>
            <StoreIcon size={15} />
            {store.label}
            <span className="sr-only">(새 창)</span>
          </a>
          <Link href="/sitemap" className={styles.link}>
            사이트맵
          </Link>
        </div>
      </div>
    </div>
  );
}
