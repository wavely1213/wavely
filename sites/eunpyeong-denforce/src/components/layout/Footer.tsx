import Link from "next/link";
import { MarkupGroups } from "@/components/ui/MarkupGroups";
import { NAV } from "@/config/site";
import { snsLinks } from "@/lib/club";
import { renderMarkup, renderPlain } from "@/lib/content/markup";
import { isExternalLink } from "@/lib/content/values";
import { FOOTER_TOKEN_KINDS, footerTokens } from "@/lib/content/views";
import { getClubSettings, getContentList, getSiteContent, getStaff } from "@/lib/repo";
import { staffNameByRole } from "@/lib/staff";
import styles from "./Footer.module.css";

export async function Footer() {
  // 푸터 글은 관리자 › 홈페이지 내용 › 공통(헤더/푸터)에서 고친다 (D-048).
  // {단장}은 관리자 '코칭스태프'(직책 '단장'), {문의메일}·{문의전화}·{사무국주소}는 관리자 '구단정보'의 값
  const [settings, staff, content, links] = await Promise.all([getClubSettings(), getStaff(), getSiteContent(), getContentList("footer.links")]);
  const name = content["site.name"];
  const tokens = footerTokens(content, settings, staffNameByRole(staff, "단장"));
  // 이름표(밝은 굵은 글씨)와 값(회색)을 나눠 한 줄에 여러 정보가 붙어 보이지 않게 — 묶음 사이는 기호 없이 간격만 (소유자 지시)
  const lines = renderMarkup(content["footer.lines"], tokens, FOOTER_TOKEN_KINDS);
  const legal = renderMarkup(content["footer.legal"], tokens, FOOTER_TOKEN_KINDS)[0] ?? [];
  const copyright = renderPlain(content["footer.copyright"], tokens);
  const markup = { group: styles.group, label: styles.label, nowrap: styles.nowrap };
  // 맨 아래 사업자 정보는 한 줄에 나란히 (BR-028)
  const legalMarkup = { group: styles.legalGroup, label: styles.legalLabel, nowrap: styles.nowrap };
  return (
    <footer className={styles.footer} data-surface="dark">
      <div className={`container ${styles.inner}`}>
        <div className={styles.about}>
          <strong className={styles.name}>{name}</strong>
          {lines.map((line, i) => (
            <p key={i}>
              <MarkupGroups groups={line} classes={markup} />
            </p>
          ))}
          <ul className={styles.sns}>
            {snsLinks(settings).map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer">
                  {s.label} <span aria-hidden="true">↗</span>
                  <span className="sr-only">(새 창)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* 사이트맵 6칸 — 1차 메뉴와 그 아래 2차 (리디자인 D-067) */}
        <nav className={styles.links} aria-label="사이트맵">
          {NAV.map((item) => (
            <div key={item.href} className={styles.col}>
              <Link href={item.href} className={styles.colTitle}>
                {item.label}
              </Link>
              {item.children && (
                <ul className={styles.colList}>
                  {item.children.map((c) => (
                    <li key={c.href}>
                      <Link href={c.href}>{c.label}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
      </div>
      <div className="container">
        <div className={styles.copy}>
          <span>{copyright}</span>
          <span className={styles.legal}>
            {legal.length > 0 && (
              <span>
                <MarkupGroups groups={legal} classes={legalMarkup} />
              </span>
            )}
            {links.map((l) =>
              isExternalLink(l.link) ? (
                <a key={l.id} href={l.link} target="_blank" rel="noreferrer">
                  {l.title}
                </a>
              ) : (
                <Link key={l.id} href={l.link}>
                  {l.title}
                </Link>
              ),
            )}
            {/* 관리자 대시보드로 가는 작은 버튼 — 로그인 전이면 로그인 화면으로 간다. 방문자마다 미리 받지 않게 prefetch 끔 */}
            <Link href="/admin" prefetch={false} rel="nofollow" className={styles.admin}>
              관리자
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
