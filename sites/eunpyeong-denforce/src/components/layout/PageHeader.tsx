import Link from "next/link";
import { findSection } from "@/config/site";
import styles from "./PageHeader.module.css";

/** 하위 페이지 상단: 섹션명 + 제목 + 같은 섹션의 탭. current 는 이 페이지의 메뉴 href. */
export function PageHeader({ title, current }: { title: string; current: string }) {
  const section = findSection(current);
  const tabs = section?.children ?? [];

  return (
    <div className={styles.wrap}>
      <div className={`container ${styles.head}`}>
        {section && section.label !== title && <p className={styles.section}>{section.label}</p>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {tabs.length > 0 && (
        <nav className={styles.tabs} aria-label={`${section?.label} 메뉴`}>
          <div className={`container ${styles.tabList}`}>
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
          </div>
        </nav>
      )}
    </div>
  );
}
