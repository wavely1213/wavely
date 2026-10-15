import Link from "next/link";
import { NAV, SITE } from "@/config/site";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.about}>
          <strong className={styles.name}>{SITE.name}</strong>
          <p>
            창단 {SITE.founded} · 홈구장 {SITE.homeVenue}
          </p>
          <p>
            문의 <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
            {SITE.contact.phone && <> · {SITE.contact.phone}</>}
          </p>
          <ul className={styles.sns}>
            {SITE.sns
              .filter((s) => s.href)
              .map((s) => (
                <li key={s.label}>
                  <a href={s.href!} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
          </ul>
        </div>

        <nav className={styles.links} aria-label="사이트맵">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className={`container ${styles.copy}`}>
        <span>
          © {SITE.name}. All rights reserved.
        </span>
        <span className={styles.legal}>
          <Link href="/privacy">개인정보처리방침</Link>
        </span>
      </div>
    </footer>
  );
}
