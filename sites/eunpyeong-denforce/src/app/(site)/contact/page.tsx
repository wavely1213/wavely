import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { snsLinks } from "@/lib/club";
import { mailDraftHref, snsHandle, telHref, topicSubject } from "@/lib/contact";
import { contentLines } from "@/lib/content/values";
import { pageMetadata } from "@/lib/page-meta";
import { getClubSettings, getSiteContent } from "@/lib/repo";
import local from "./contact.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("문의", "/contact");
}

export default async function ContactPage() {
  const [settings, content] = await Promise.all([getClubSettings(), getSiteContent()]);
  // 문의 분야 — 관리자 › 홈페이지 내용 › 문의 (한 줄에 하나, 같은 줄은 한 번만)
  const topics = [...new Set(contentLines(content["contact.topics"]))];
  const email = settings.contactEmail;
  const phone = settings.contactPhone;
  const tel = phone ? telHref(phone) : null;
  return (
    <>
      <PageHeader title="문의" current="/contact" />
      <div className={`container ${local.body}`}>
        {/* 연락처 2 x 2 카드 (리디자인 3차 157:19356) — 링크는 카드 전체가 누르는 곳 */}
        <ul className={local.info}>
          <li>
            {email ? (
              <a href={`mailto:${email}`} className={local.infoCard}>
                <span className={local.infoLabel}>이메일</span>
                <span className={local.infoValue}>{email}</span>
              </a>
            ) : (
              <div className={local.infoCard}>
                <span className={local.infoLabel}>이메일</span>
                <span className={`${local.infoValue} ${local.plain}`}>준비 중</span>
              </div>
            )}
          </li>
          <li>
            {tel ? (
              <a href={tel} className={local.infoCard}>
                <span className={local.infoLabel}>전화</span>
                <span className={local.infoValue}>{phone}</span>
              </a>
            ) : (
              <div className={local.infoCard}>
                <span className={local.infoLabel}>전화</span>
                <span className={`${local.infoValue} ${local.plain}`}>{phone ?? "준비 중"}</span>
              </div>
            )}
          </li>
          {settings.contactAddress && (
            <li>
              <div className={local.infoCard}>
                <span className={local.infoLabel}>주소</span>
                <span className={`${local.infoValue} ${local.plain}`}>{settings.contactAddress}</span>
              </div>
            </li>
          )}
          {snsLinks(settings).map((s) => (
            <li key={s.label}>
              {/* 인스타그램 주소는 '@계정'으로 짧게 보이고 링크는 주소 그대로 */}
              <a href={s.href} target="_blank" rel="noreferrer" className={local.infoCard}>
                <span className={local.infoLabel}>{s.label}</span>
                <span className={local.infoValue}>
                  {snsHandle(s.href) ?? s.href} <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (새 창)</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <section>
          <h2 className={local.h2}>{content["contact.section.topics"]}</h2>
          <div className={local.topics}>
            {topics.map((t) =>
              // 문의 메일이 있으면 카드를 누를 때 제목이 채워진 메일 쓰기 창이 열린다
              email ? (
                <a key={t} href={mailDraftHref(email, topicSubject(t))} className={local.topic}>
                  <h3 className={local.topicTitle}>{t}</h3>
                  <p className={local.topicNote}>누르면 {topicSubject(t)} 제목으로 메일 쓰기 창이 열립니다.</p>
                  <span className={local.topicMore}>
                    메일 쓰기 <span aria-hidden="true">→</span>
                  </span>
                </a>
              ) : (
                <div key={t} className={local.topic}>
                  <h3 className={local.topicTitle}>{t}</h3>
                  <p className={local.topicNote}>이메일 제목에 {topicSubject(t)}를 적어 보내주세요.</p>
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </>
  );
}
