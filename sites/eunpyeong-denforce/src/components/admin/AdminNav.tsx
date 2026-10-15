"use client";

import Link from "@/components/admin/AdminLink";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/config/admin-nav";
import styles from "./admin.module.css";

/** pathname 을 모를 때(Suspense fallback)는 활성 표시 없이 그린다 */
export function AdminNavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className={styles.nav} aria-label="관리자 메뉴">
      {ADMIN_NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={`${styles.navLink} ${active ? styles.navActive : ""}`}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />;
}
