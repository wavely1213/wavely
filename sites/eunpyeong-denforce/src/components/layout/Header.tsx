"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { NAV, SITE } from "@/config/site";
import styles from "./Header.module.css";

/** pathname 은 활성 메뉴 표시용. 모르면 빈 문자열 (Suspense fallback). */
export function Header({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className={styles.header}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          <Image src={SITE.emblemMark} alt="" width={30} height={38} loading="eager" />
          <span className={styles.brandText}>
            <small>{SITE.nameEn}</small>
            <strong>{SITE.name}</strong>
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
        </nav>
      </div>
    </header>
  );
}
