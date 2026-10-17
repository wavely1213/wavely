import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { snsLinks } from "@/lib/club";
import { getClubSettings } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "문의" };

// 입단/테스트는 받지 않는다 (2026-10-17 소유자 지시)
const TOPICS = ["스폰서십/제휴", "아카데미/유소년", "언론/취재", "기타"];

export default async function ContactPage() {
  const settings = await getClubSettings();
  return (
    <>
      <PageHeader title="문의" current="/contact" />
      <div className={`container ${styles.body}`}>
        <ul className={styles.list}>
          <li>
            <span>이메일</span>
            {settings.contactEmail ? (
              <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
            ) : (
              <span>준비 중</span>
            )}
          </li>
          <li>
            <span>전화</span>
            <span>{settings.contactPhone ?? "준비 중"}</span>
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
              <a href={s.href} target="_blank" rel="noreferrer">
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
