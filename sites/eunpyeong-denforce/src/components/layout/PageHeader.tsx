import Link from "next/link";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { findSection } from "@/config/site";
import styles from "./PageHeader.module.css";

/**
 * 하위 페이지 상단: 섹션명 + 제목 + 같은 섹션의 탭. current 는 이 페이지의 메뉴 href.
 * compact: 글/선수 상세처럼 본문에 이 페이지의 큰 제목(h1)이 있는 페이지 — 메뉴 이름(제목)을 작게, 제목 태그 없이 보인다.
 */
export function PageHeader({ title, current, compact = false }: { title: string; current: string; compact?: boolean }) {
  const section = findSection(current);
  const tabs = section?.children ?? [];

  return (
    <div className={styles.wrap}>
      <div className={`container ${styles.head} ${compact ? styles.headCompact : ""}`}>
        {section && section.label !== title && <p className={styles.section}>{section.label}</p>}
        {compact ? <p className={styles.titleCompact}>{title}</p> : <h1 className={styles.title}>{title}</h1>}
      </div>
      {tabs.length > 0 && (
        <nav className={styles.tabs} aria-label={`${section?.label} 메뉴`}>
          {/* 휴대폰에서 고른 탭이 화면 밖이면 옆으로 옮겨 보이고, 가려진 탭 쪽 끝은 흐리게 */}
          <ScrollRow className={`container ${styles.tabList}`} activeKey={current}>
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`${styles.tab} ${t.href === current ? styles.tabActive : ""}`}
                aria-current={t.href === current ? "page" : undefined}
              >
                {t.label}
              </Link>
            ))}
          </ScrollRow>
        </nav>
      )}
    </div>
  );
}
