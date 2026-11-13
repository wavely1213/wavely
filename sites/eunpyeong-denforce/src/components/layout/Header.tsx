"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FocusEvent, type MouseEvent, type PointerEvent } from "react";
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
 * - PC: 1차 메뉴 한 줄(지금 페이지는 노란 2px 밑줄) + 오른쪽 구분선 뒤 SNS / MD스토어 / 사이트맵 (헤더 C, 위 띠 TopBar 없앰 D-079). 마우스를 1차 메뉴에 올리거나 키보드 초점이 메뉴에 오면 MegaMenu(전폭 black-soft, 모든 2차 메뉴).
 *   열림은 마우스 열림/키보드 열림 두 상태로 관리한다 — 마우스는 헤더(바 + 메가) 밖으로 나가면 잠시 뒤 닫히고, 키보드는 초점이 메뉴 밖으로 나가면 닫힌다.
 *   페이지가 바뀌면 닫히고, Esc 로 어디서든 닫는다(메뉴 안 초점이면 그 1차 메뉴로).
 * - 휴대폰(960px 이하): 메뉴 버튼 → 전체 화면 메뉴(1차 + 2차, 맨 아래 SNS / MD스토어 / 사이트맵 — D-042). Esc 로 닫으면 메뉴 버튼으로 초점.
 * content: 구단 이름/영문 이름/MD스토어 링크 (관리자 › 홈페이지 내용 › 기본 정보, D-046). pathname 은 활성 메뉴 표시용(모르면 빈 문자열).
 */
export function Header({ pathname, sns, content }: { pathname: string; sns: SnsLink[]; content: HeaderContent }) {
  const [open, setOpen] = useState(false);
  // PC 메가메뉴 상태 — 초점 위치(activeElement)는 보지 않는다
  //  pointerOpen: 마우스가 1차 메뉴에 들어오면 true, 헤더(바 + 메가)에서 나가면 잠시 뒤 false
  //  keyboardOpen: 메뉴 안 요소가 키보드 초점(:focus-visible)을 받으면 true, 초점이 메뉴 밖으로 나가면 false
  //  dismissed: 메뉴 안에 초점이 있을 때 Esc 로 닫음 — 초점이 메뉴 밖으로 나가거나, 밖에서 다시 들어오거나, 마우스가 다시 들어오면 풀림
  const [pointerOpen, setPointerOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const megaOpen = (pointerOpen || keyboardOpen) && !dismissed;

  // 주소가 바뀌면(링크, 뒤로/앞으로 가기) 메뉴 상태를 모두 처음으로 — 렌더 중에 이전 주소와 비교 (React 권장 방식)
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
    setPointerOpen(false);
    setKeyboardOpen(false);
    setDismissed(false);
  }

  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const activeChild = activeChildHref(pathname);

  const cancelClose = () => window.clearTimeout(closeTimer.current);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // 휴대폰 전체 화면 메뉴: Esc 로 닫고 메뉴 버튼으로 초점을 돌려준다
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // PC 메가메뉴: 열려 있으면 어디서든 Esc 로 닫는다 (마우스로 연 경우 포함, WCAG 1.4.13)
  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      window.clearTimeout(closeTimer.current);
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || !navRef.current?.contains(el)) {
        // 초점이 메뉴 밖(마우스로 연 경우) — 마우스 열림만 닫는다
        setPointerOpen(false);
        return;
      }
      // 초점이 메뉴 안 — 닫고, 메가 안이었으면 그 칸의 1차 메뉴로 초점 (메가가 닫혀 초점이 사라지지 않게)
      setDismissed(true);
      const top = el.closest<HTMLElement>("[data-top]")?.dataset.top;
      if (top) navRef.current.querySelector<HTMLElement>(`a[data-top-link="${top}"]`)?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [megaOpen]);

  // 링크를 누르면 메뉴를 닫는다 (같은 페이지 링크도)
  const onLinkClick = (e: MouseEvent<HTMLElement>) => {
    setOpen(false);
    cancelClose();
    setPointerOpen(false);
    setKeyboardOpen(false);
    e.currentTarget.blur();
  };

  // ── PC 메가메뉴 열고 닫기 ──
  const onMenuPointerEnter = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !matches(FINE_HOVER) || !matches(DESKTOP)) return;
    cancelClose();
    setPointerOpen(true);
    setDismissed(false);
  };
  const onHeaderPointerLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setPointerOpen(false), CLOSE_DELAY_MS);
  };
  // 키보드 초점(focus-visible)일 때만 연다 — 마우스/터치 누름으로 생긴 초점으로는 열지 않는다
  const onNavFocus = (e: FocusEvent<HTMLElement>) => {
    const fromOutside = !navRef.current?.contains(e.relatedTarget as Node | null);
    if (fromOutside) setDismissed(false);
    if (matches(DESKTOP) && e.target instanceof Element && e.target.matches(":focus-visible")) setKeyboardOpen(true);
  };
  const onNavBlur = (e: FocusEvent<HTMLElement>) => {
    if (navRef.current?.contains(e.relatedTarget as Node | null)) return;
    setKeyboardOpen(false);
    setDismissed(false);
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
          onClick={() => setOpen((v) => !v)}
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
              <Link href="/sitemap" className={styles.mobileSitemap} onClick={onLinkClick}>
                사이트맵
              </Link>
            </div>
          </div>
        </nav>

        {/* PC 유틸 (헤더 C 한 줄, D-079) — 메뉴 오른쪽 구분선 뒤 SNS / MD스토어 / 사이트맵. 휴대폰은 위 메뉴 안 mobileExtra */}
        <span className={styles.utilDivider} aria-hidden="true" />
        <div className={styles.util}>
          {sns.length > 0 && (
            <ul className={styles.utilSns} aria-label="공식 SNS">
              {sns.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className={styles.utilIcon}>
                    <SnsIcon name={s.label} />
                    <span className="sr-only">{s.label} (새 창)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a href={content.externalHref} target="_blank" rel="noopener noreferrer" className={styles.utilStore}>
            <StoreIcon size={15} />
            {content.externalLabel}
            <span className="sr-only">(새 창)</span>
          </a>
          <Link href="/sitemap" className={styles.utilLink} onClick={onLinkClick}>
            사이트맵
          </Link>
        </div>
      </div>
    </header>
  );
}
