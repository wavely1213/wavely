"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type KeyboardEvent, type MouseEvent } from "react";
import { SnsIcon } from "@/components/ui/SnsIcon";
import { StoreIcon } from "@/components/ui/StoreIcon";
import { NAV, SITE } from "@/config/site";
import type { SnsLink } from "@/lib/club";
import type { HeaderContent } from "@/lib/content/views";
import styles from "./Header.module.css";

/**
 * 사이트 헤더 (리디자인 D-067, D-069 1단계).
 * - PC: 1차 메뉴 한 줄(지금 페이지는 노란 2px 밑줄). 1차 메뉴에 마우스를 올리거나 초점이 오면 MegaMenu(전폭 black-soft, 모든 2차 메뉴)가 열린다.
 * - 휴대폰(960px 이하): 메뉴 버튼 → 전체 화면 메뉴(1차 + 2차, 맨 아래 SNS / MD스토어 / 사이트맵 — D-042).
 * content: 구단 이름/영문 이름/MD스토어 링크 (관리자 › 홈페이지 내용 › 기본 정보, D-046). pathname 은 활성 메뉴 표시용(모르면 빈 문자열).
 */
export function Header({ pathname, sns, content }: { pathname: string; sns: SnsLink[]; content: HeaderContent }) {
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // 메뉴가 열려 있으면 Esc 로 닫는다 (휴대폰 전체 화면 메뉴)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 링크를 누르면 메뉴를 닫고, 초점 때문에 PC 메가메뉴가 열린 채 남지 않게 초점을 놓는다
  const closeAfterClick = (e: MouseEvent<HTMLElement>) => {
    setOpen(false);
    e.currentTarget.blur();
  };

  // PC 메가메뉴: Esc 로 닫기(초점을 놓는다)
  const onNavKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape" && document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  return (
    <header className={styles.header} data-surface="dark">
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} onClick={closeAfterClick}>
          <Image src={SITE.emblemMark} alt="" width={40} height={51} loading="eager" className={styles.mark} />
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
          <span className="sr-only">{open ? "메뉴 닫기" : "메뉴 열기"}</span>
          <span className={`${styles.toggleIcon} ${open ? styles.toggleIconClose : ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <nav id="site-nav" className={`${styles.nav} ${open ? styles.navOpen : ""}`} onKeyDown={onNavKeyDown}>
          <ul className={styles.menu}>
            {NAV.map((item) => {
              const active = [item, ...(item.children ?? [])].some((n) => isActive(n.href));
              return (
                <li key={item.href} className={styles.menuItem}>
                  <Link
                    href={item.href}
                    className={`${styles.menuLink} ${active ? styles.active : ""}`}
                    aria-current={active ? "true" : undefined}
                    onClick={closeAfterClick}
                  >
                    {item.label}
                  </Link>
                  {/* 휴대폰 메뉴의 2차 — PC 는 아래 메가메뉴가 대신 보인다 */}
                  {item.children && (
                    <ul className={styles.sub}>
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} onClick={closeAfterClick}>
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

          {/* PC 메가메뉴 — 1차 메뉴에 마우스/초점이 있는 동안 전체 2차 메뉴를 한 번에 */}
          <div className={styles.mega}>
            <div className={`container ${styles.megaInner}`}>
              {NAV.map((item) => (
                <div key={item.href} className={styles.megaCol}>
                  <Link href={item.href} className={styles.megaLabel} onClick={closeAfterClick}>
                    {item.label}
                  </Link>
                  {item.children && (
                    <ul className={styles.megaList}>
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            className={isActive(c.href) ? styles.megaActive : undefined}
                            aria-current={pathname === c.href ? "page" : undefined}
                            onClick={closeAfterClick}
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.mobileExtra}>
            <ul className={styles.mobileSns} aria-label="공식 SNS">
              {sns.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                    <SnsIcon name={s.label} size={20} />
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
              <Link href="/sitemap" className={styles.mobileSitemap} onClick={closeAfterClick}>
                사이트맵
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
