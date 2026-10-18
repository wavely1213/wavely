import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { snsLinks } from "@/lib/club";
import { CONTACT_TOPICS, mailDraftHref, snsHandle, telHref, topicSubject } from "@/lib/contact";
import { getClubSettings } from "@/lib/repo";
import styles from "@/styles/prose.module.css";
import local from "./contact.module.css";
import { pageMetadata } from "@/lib/page-meta";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("문의", "/contact");
}

export default async function ContactPage() {
  const settings = await getClubSettings();
  const email = settings.contactEmail;
  const phone = settings.contactPhone;
  const tel = phone ? telHref(phone) : null;
  return (
    <>
      <PageHeader title="문의" current="/contact" />
      <div className={`container ${styles.body}`}>
        <ul className={styles.list}>
          <li>
            <span>이메일</span>
            {email ? <a href={`mailto:${email}`}>{email}</a> : <span>준비 중</span>}
          </li>
          <li>
            <span>전화</span>
            {tel ? <a href={tel}>{phone}</a> : <span>{phone ?? "준비 중"}</span>}
          </li>
          {settings.contactAddress && (
            <li>
              <span>주소</span>
              <span>{settings.contactAddress}</span>
            </li>
          )}
          {snsLinks(settings).map((s) => (
            <li key={s.label}>
              <span>{s.label}</span>
              {/* 인스타그램 주소는 '@계정'으로 짧게 보이고 링크는 주소 그대로 */}
              <a href={s.href} target="_blank" rel="noreferrer">
                {snsHandle(s.href) ?? s.href}
                <span className="sr-only"> (새 창)</span>
              </a>
            </li>
          ))}
        </ul>
        <section>
          <h2 className={styles.h2}>문의 분야</h2>
          <div className={styles.cards}>
            {CONTACT_TOPICS.map((t) =>
              // 문의 메일이 있으면 카드를 누를 때 제목이 채워진 메일 쓰기 창이 열린다
              email ? (
                <a key={t} href={mailDraftHref(email, topicSubject(t))} className={`${styles.card} ${local.topic}`}>
                  <h3>{t}</h3>
                  <p className={styles.note}>누르면 {topicSubject(t)} 제목으로 메일 쓰기 창이 열립니다.</p>
                </a>
              ) : (
                <div key={t} className={styles.card}>
                  <h3>{t}</h3>
                  <p className={styles.note}>이메일 제목에 {topicSubject(t)}를 적어 보내주세요.</p>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </>
  );
}
