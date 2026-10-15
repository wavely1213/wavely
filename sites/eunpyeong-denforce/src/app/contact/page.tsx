import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { SITE } from "@/config/site";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "문의" };

const TOPICS = ["스폰서십·제휴", "입단·테스트", "아카데미·유소년", "언론·취재", "기타"];

export default function ContactPage() {
  return (
    <>
      <PageHeader title="문의" current="/contact" />
      <div className={`container ${styles.body}`}>
        <ul className={styles.list}>
          <li>
            <span>이메일</span>
            <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
          </li>
          <li>
            <span>전화</span>
            <span>{SITE.contact.phone ?? "준비 중"}</span>
          </li>
          {SITE.sns
            .filter((s) => s.href)
            .map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <a href={s.href!} target="_blank" rel="noreferrer">
                  {s.href}
                </a>
              </li>
            ))}
        </ul>
        <section>
          <h2 className={styles.h2}>문의 분야</h2>
          <div className={styles.cards}>
            {TOPICS.map((t) => (
              <div key={t} className={styles.card}>
                <h3>{t}</h3>
                <p className={styles.note}>이메일 제목에 [{t}]를 적어 보내주세요.</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
