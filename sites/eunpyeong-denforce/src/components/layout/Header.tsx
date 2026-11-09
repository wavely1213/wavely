"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { SnsIcon } from "@/components/ui/SnsIcon";
import { StoreIcon } from "@/components/ui/StoreIcon";
import { NAV, SITE } from "@/config/site";
import type { SnsLink } from "@/lib/club";
import type { HeaderContent } from "@/lib/content/views";
import styles from "./Header.module.css";

/** PC 메뉴 폭 (Header.module.css 의 휴대폰 기준 960 과 같게) */
const DESKTOP = "(min-width: 961px)";
/** 마우스처럼 정확히 가리키는 장치만 hover 로 연다 — 터치 태블릿은 누를 때 hover 가 남는다 */
const FINE_HOVER = "(hover: hover) and (pointer: fine)";
/** 헤더 밖으로 나간 뒤 닫히기까지 — 메뉴에서 대각선으로 내려가다 잠깐 벗어나도 닫히지 않게 */
const CLOSE_DELAY_MS = 200;

const matches = (query: string) => typeof window !== "undefined" && window.matchMedia(query).matches;

/** 지금 페이지의 2차 메뉴 — 주소와 맞는 것 중 가장 긴 하나 (선수 상세 → '선수') */
function activeChildHref(pathname: string): string | null {
  let best: string | null = null;
  for (const item of NAV) {
    for (const c of item.children ?? []) {
      const hit = pathname === c.href || pathname.startsWith(c.href + "/");
      if (hit && (!best || c.href.length > best.length)) best = c.href;
    }
  }
  return best;
}

/**
 * 사이트 헤더 (리디자인 D-067, D-069 1단계).
 * - PC: 1차 메뉴 한 줄(지금 페이지는 노란 2px 밑줄). 마우스를 1차 메뉴에 올리거나 키보드 초점이 메뉴에 오면 MegaMenu(전폭 black-soft, 모든 2차 메뉴).
 *   열림은 상태로 관리한다 — 헤더(바 + 메가) 밖으로 나가면 잠시 뒤 닫히고, 페이지가 바뀌면 닫히고, Esc 로 닫는다(초점은 그 1차 메뉴로).
 * - 휴대폰(960px 이하): 메뉴 버튼 → 전체 화면 메뉴(1차 + 2차, 맨 아래 SNS / MD스토어 / 사이트맵 — D-042). Esc 로 닫으면 메뉴 버튼으로 초점.
 * content: 구단 이름/영문 이름/MD스토어 링크 (관리자 › 홈페이지 내용 › 기본 정보, D-046). pathname 은 활성 메뉴 표시용(모르면 빈 문자열).
 */
export function Header({ pathname, sns, content }: { pathname: string; sns: SnsLink[]; content: HeaderContent }) {
  // 열린 '주소'를 기억한다 — 다른 페이지로 가면 저절로 닫힌 상태가 된다
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [megaPath, setMegaPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const megaOpen = megaPath === pathname;

  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  /** Esc 로 닫은 뒤에는 초점이 메뉴 밖으로 나갈 때까지 다시 열지 않는다 */
  const dismissed = useRef(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const activeChild = activeChildHref(pathname);

  const cancelClose = () => window.clearTimeout(closeTimer.current);
  const openMega = () => {
    cancelClose();
    setMegaPath(pathname);
  };
  const closeMega = () => {
    cancelClose();
    setMegaPath(null);
  };

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // 휴대폰 전체 화면 메뉴: Esc 로 닫고 메뉴 버튼으로 초점을 돌려준다
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenPath(null);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 링크를 누르면 메뉴를 닫는다 (같은 페이지 링크도)
  const onLinkClick = (e: MouseEvent<HTMLElement>) => {
    setOpenPath(null);
    closeMega();
    e.currentTarget.blur();
  };

  // ── PC 메가메뉴 열고 닫기 ──
  const onMenuPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && matches(FINE_HOVER) && matches(DESKTOP)) openMega();
  };
  const onHeaderPointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !megaOpen) return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setMegaPath(null), CLOSE_DELAY_MS);
  };
  // 키보드 초점(focus-visible)일 때만 연다 — 터치로 링크를 누를 때 생기는 초점으로는 열지 않는다
  const onNavFocus = (e: FocusEvent<HTMLElement>) => {
    if (dismissed.current || !matches(DESKTOP)) return;
    if (e.target instanceof Element && e.target.matches(":focus-visible")) openMega();
  };
  const onNavBlur = (e: FocusEvent<HTMLElement>) => {
    if (navRef.current?.contains(e.relatedTarget as Node | null)) return;
    dismissed.current = false;
    closeMega();
  };
  const onNavKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Escape" || !megaOpen) return;
    dismissed.current = true;
    closeMega();
    // 메가 안에 초점이 있었으면 그 칸의 1차 메뉴로 돌려준다 (메가가 닫혀 초점이 사라지지 않게)
    const top = e.target instanceof HTMLElement ? e.target.closest<HTMLElement>("[data-top]")?.dataset.top : undefined;
    if (top) navRef.current?.querySelector<HTMLElement>(`a[data-top-link="${top}"]`)?.focus();
  };

  return (
    <header className={styles.header} data-surface="dark" onPointerLeave={onHeaderPointerLeave}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} onClick={onLinkClick}>
          <Image src={SITE.emblemMark} alt="" width={40} height={51} loading="eager" className={styles.mark} />
          <span className={styles.brandText}>
            <small>{content.nameEn}</small>
            <strong>{content.name}</strong>
          </span>
        </Link>

        <button
          ref={toggleRef}
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpenPath(open ? null : pathname)}
        >
          <span className="sr-only">{open ? "메뉴 닫기" : "메뉴 열기"}</span>
          <span className={`${styles.toggleIcon} ${open ? styles.toggleIconClose : ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <nav
          ref={navRef}
          id="site-nav"
          className={`${styles.nav} ${open ? styles.navOpen : ""}`}
          onKeyDown={onNavKeyDown}
          onFocus={onNavFocus}
          onBlur={onNavBlur}
        >
          <ul className={styles.menu} onPointerEnter={onMenuPointerEnter}>
            {NAV.map((item) => {
              const active = [item, ...(item.children ?? [])].some((n) => isActive(n.href));
              return (
                <li key={item.href} className={styles.menuItem}>
                  <Link
                    href={item.href}
                    data-top-link={item.href}
                    className={`${styles.menuLink} ${active ? styles.active : ""}`}
                    aria-current={active ? "true" : undefined}
                    onClick={onLinkClick}
                  >
                    {item.label}
                  </Link>
                  {/* 휴대폰 메뉴의 2차 — PC 는 아래 메가메뉴가 대신 보인다 */}
                  {item.children && (
                    <ul className={styles.sub}>
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} onClick={onLinkClick}>
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

          {/* PC 메가메뉴 — 칸 제목은 글자(1차 링크와 겹치지 않게), 2차만 링크 */}
          <div
            id="site-mega"
            role="group"
            aria-label="전체 메뉴"
            className={`${styles.mega} ${megaOpen ? styles.megaOpen : ""}`}
            onPointerEnter={cancelClose}
          >
            <div className={`container ${styles.megaInner}`}>
              {NAV.map((item) => (
                <div key={item.href} className={styles.megaCol} data-top={item.href}>
                  <p className={styles.megaLabel}>{item.label}</p>
                  {item.children && (
                    <ul className={styles.megaList}>
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            className={c.href === activeChild ? styles.megaActive : undefined}
                            aria-current={pathname === c.href ? "page" : undefined}
                            onClick={onLinkClick}
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
                  <a href={s.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpenPath(null)}>
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
                onClick={() => setOpenPath(null)}
              >
                <StoreIcon size={16} />
                {content.externalLabel}
                <span className="sr-only">(새 창)</span>
              </a>
              <Link href="/sitemap" className={styles.mobileSitemap} onClick={onLinkClick}>
                사이트맵
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
