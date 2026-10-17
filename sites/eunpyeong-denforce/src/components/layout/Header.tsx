"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SnsIcon } from "@/components/ui/SnsIcon";
import { StoreIcon } from "@/components/ui/StoreIcon";
import { NAV, SITE } from "@/config/site";
import type { SnsLink } from "@/lib/club";
import type { HeaderContent } from "@/lib/content/views";
import styles from "./Header.module.css";

/**
 * content: 구단 이름·영문 이름·메뉴 맨 오른쪽 바깥 링크 (관리자 › 홈페이지 내용 › 기본 정보, D-046).
 * pathname 은 활성 메뉴 표시용. 모르면 빈 문자열 (Suspense fallback).
 * sns 는 모바일 메뉴 맨 아래에 사이트맵과 함께 보인다 (PC 는 상단 띠 TopBar — D-042).
 */
export function Header({ pathname, sns, content }: { pathname: string; sns: SnsLink[]; content: HeaderContent }) {
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          <Image src={SITE.emblemMark} alt="" width={30} height={38} loading="eager" />
          <span className={styles.brandText}>
            <small>{content.nameEn}</small>
            <strong>{content.name}</strong>
          </span>
        </Link>

        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">메뉴 열기</span>
          <span className={styles.toggleBar} />
          <span className={styles.toggleBar} />
          <span className={styles.toggleBar} />
        </button>

        <nav id="site-nav" className={`${styles.nav} ${open ? styles.navOpen : ""}`}>
          <ul className={styles.menu}>
            {NAV.map((item) => {
              const active = [item, ...(item.children ?? [])].some((n) => isActive(n.href));
              return (
                <li key={item.href} className={styles.menuItem}>
                  <Link
                    href={item.href}
                    className={`${styles.menuLink} ${active ? styles.active : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                  {item.children && (
                    <ul className={styles.sub}>
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} onClick={() => setOpen(false)}>
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className={styles.mobileExtra}>
            <ul className={styles.mobileSns} aria-label="공식 SNS">
              {sns.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                    <SnsIcon name={s.label} size={18} />
                    <span className="sr-only">{s.label} (새 창)</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className={styles.mobileLinks}>
              <a
                href={content.externalHref}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.mobileStore}
                onClick={() => setOpen(false)}
              >
                <StoreIcon size={16} />
                {content.externalLabel}
                <span className="sr-only">(새 창)</span>
              </a>
              <Link href="/sitemap" className={styles.mobileSitemap} onClick={() => setOpen(false)}>
                사이트맵
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
