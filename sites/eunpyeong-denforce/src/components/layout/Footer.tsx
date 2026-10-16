import Link from "next/link";
import { NAV } from "@/config/site";
import { snsLinks } from "@/lib/club";
import { yearOf } from "@/lib/content/values";
import { getClubSettings, getSiteContent, getStaff } from "@/lib/repo";
import { staffNameByRole } from "@/lib/staff";
import styles from "./Footer.module.css";

export async function Footer() {
  // 구단 이름·창단·홈구장·대표는 관리자 › 홈페이지 내용 › 기본 정보 (D-046)
  const [settings, staff, content] = await Promise.all([getClubSettings(), getStaff(), getSiteContent()]);
  const name = content["site.name"];
  // 단장 이름은 관리자 '스태프'(직책 '단장'), 문의 메일·전화는 관리자 '구단정보'에서 고친다
  const director = staffNameByRole(staff, "단장");
  const hasContact = Boolean(settings.contactEmail || settings.contactPhone);
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.about}>
          <strong className={styles.name}>{name}</strong>
          {/* 라벨(밝은 굵은 글씨)과 값(회색)을 나눠 한 줄에 여러 정보가 붙어 보이지 않게 한다 */}
          <p>
            <span className={styles.label}>창단</span>
            {yearOf(content["site.foundedDate"])} · <span className={styles.label}>홈구장</span>
            {content["site.homeVenue"]}
          </p>
          {settings.contactAddress && (
            <p>
              <span className={styles.label}>사무국</span>
              {settings.contactAddress}
            </p>
          )}
          {(director || hasContact) && (
            <p>
              {/* 좁은 화면에서는 '단장'·'문의' 묶음째 줄을 바꾸고, 전화번호는 하이픈에서 끊기지 않게 */}
              {director && (
                <span className={styles.group}>
                  <span className={styles.label}>단장</span>
                  {director}
                  {hasContact && " · "}
                </span>
              )}
              {director && hasContact && " "}
              {hasContact && (
                <span className={styles.group}>
                  <span className={styles.label}>문의</span>
                  {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>}
                  {settings.contactEmail && settings.contactPhone && " / "}
                  {settings.contactPhone && <span className={styles.nowrap}>{settings.contactPhone}</span>}
                </span>
              )}
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
          © {name}. All rights reserved.
        </span>
        <span className={styles.legal}>
          <span>
            <span className={styles.label}>대표</span>
            {content["site.representative"]}
          </span>
          <Link href="/privacy">개인정보처리방침</Link>
          {/* 관리자 대시보드로 가는 작은 버튼 — 로그인 전이면 로그인 화면으로 간다. 방문자마다 미리 받지 않게 prefetch 끔 */}
          <Link href="/admin" prefetch={false} rel="nofollow" className={styles.admin}>
            관리자
          </Link>
        </span>
      </div>
    </footer>
  );
}
