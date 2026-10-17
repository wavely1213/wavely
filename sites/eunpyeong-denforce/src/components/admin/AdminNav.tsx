"use client";

import { usePathname } from "next/navigation";
import { useState, type MouseEvent, type ReactNode } from "react";
import { ADMIN_NAV_GROUPS, isNavActive } from "@/config/admin-nav";
import Link from "./AdminLink";
import styles from "./admin.module.css";

/** pathname 을 모를 때(Suspense fallback)는 활성 표시 없이 그린다 */
export function AdminNavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className={styles.nav} aria-label="관리자 메뉴">
      {ADMIN_NAV_GROUPS.map((group, gi) => (
        <div key={group.label ?? gi} className={styles.navGroup}>
          {group.label && <span className={styles.navGroupLabel}>{group.label}</span>}
          {group.items.map((item) => {
            const active = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${active ? styles.navActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />;
}

/**
 * 휴대폰 메뉴 — '메뉴' 버튼으로 메뉴·계정 영역을 열고 닫는다 (PC 에서는 버튼이 숨고 늘 펼쳐짐).
 * 메뉴 안의 링크를 누르면 닫는다. pathname 을 쓰지 않아 Suspense 없이 레이아웃에 둔다.
 */
export function AdminMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const closeOnLink = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  };
  return (
    <>
      <button type="button" className={styles.menuButton} aria-expanded={open} aria-controls="admin-menu" onClick={() => setOpen((o) => !o)}>
        {open ? "닫기" : "메뉴"}
      </button>
      {/* 안의 링크를 누르면(키보드 Enter 포함) 메뉴를 닫는다 */}
      <div id="admin-menu" className={`${styles.sideBody} ${open ? styles.sideBodyOpen : ""}`} onClick={closeOnLink}>
        {children}
      </div>
    </>
  );
}
