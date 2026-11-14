"use client";

import { usePathname } from "next/navigation";
import { useState, type MouseEvent, type ReactNode } from "react";
import { isNavActive, navGroupsFor } from "@/config/admin-nav";
import type { AdminRole } from "@/lib/admin/roles";
import Link from "./AdminLink";
import styles from "./admin.module.css";

/** 등급에 맞는 메뉴만 그린다 (D-057). pathname 을 모를 때는 활성 표시 없이 */
function AdminNavLinks({ pathname, role }: { pathname: string; role: AdminRole }) {
  return (
    <nav className={styles.nav} aria-label="관리자 메뉴">
      {navGroupsFor(role).map((group, gi) => (
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

export function AdminNav({ role }: { role: AdminRole }) {
  return <AdminNavLinks pathname={usePathname()} role={role} />;
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
