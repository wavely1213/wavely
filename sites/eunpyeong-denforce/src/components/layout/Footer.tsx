import Link from "next/link";
import { NAV, SITE } from "@/config/site";
import { snsLinks } from "@/lib/club";
import { getClubSettings } from "@/lib/repo";
import styles from "./Footer.module.css";

export async function Footer() {
  const settings = await getClubSettings();
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.about}>
          <strong className={styles.name}>{SITE.name}</strong>
          {/* 라벨(밝은 굵은 글씨)과 값(회색)을 나눠 한 줄에 여러 정보가 붙어 보이지 않게 한다 */}
          <p>
            <span className={styles.label}>창단</span>
            {SITE.founded} · <span className={styles.label}>홈구장</span>
            {SITE.homeVenue}
          </p>
          {settings.contactAddress && (
            <p>
              <span className={styles.label}>사무국</span>
              {settings.contactAddress}
            </p>
          )}
          {(settings.contactEmail || settings.contactPhone) && (
            <p>
              <span className={styles.label}>문의</span>
              {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>}
              {settings.contactEmail && settings.contactPhone && " · "}
              {settings.contactPhone}
            </p>
          )}
          <ul className={styles.sns}>
            {snsLinks(settings).map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer">
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
