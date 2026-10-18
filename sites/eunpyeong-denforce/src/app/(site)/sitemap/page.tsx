import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { NAV } from "@/config/site";
import { pageMetadata } from "@/lib/page-meta";
import { getSiteContent } from "@/lib/repo";
import styles from "./sitemap.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("사이트맵", "/sitemap");
}

/** 전체 메뉴를 한 화면에 (D-042) — 메뉴 구성은 config/site.ts NAV 그대로 */
export default async function SitemapPage() {
  // 바깥 링크는 관리자 › 홈페이지 내용 › 기본 정보 (D-046)
  const c = await getSiteContent();
  return (
    <>
      <PageHeader title="사이트맵" current="/sitemap" />
      <div className="container">
        <ul className={styles.grid}>
          {NAV.map((item) => (
            <li key={item.href} className={styles.group}>
              <h2 className={styles.title}>
                <Link href={item.href}>{item.label}</Link>
              </h2>
              {item.children && (
                <ul className={styles.list}>
                  {item.children.map((c) => (
                    <li key={c.href}>
                      <Link href={c.href}>{c.label}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
          <li className={styles.group}>
            <h2 className={styles.title}>바로가기</h2>
            <ul className={styles.list}>
              <li>
                <a href={c["nav.external.href"]} target="_blank" rel="noopener noreferrer">
                  {c["nav.external.label"]} ↗<span className="sr-only">(새 창)</span>
                </a>
              </li>
              <li>
                <Link href="/privacy">개인정보처리방침</Link>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </>
  );
}
