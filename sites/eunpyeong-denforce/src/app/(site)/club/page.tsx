import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { contentCards } from "@/lib/content/values";
import { getClubSettings, getContentList, getNationalTeamAlumni, getSiteContent } from "@/lib/repo";
import styles from "@/styles/prose.module.css";
import { pageMetadata } from "@/lib/page-meta";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("구단소개", "/club");
}

/** 괄호 묶음('(2017 ~ 현재)', '(유소년 / 성인)')은 한 줄에 — 괄호 안에서 줄이 바뀌지 않게 */
function KeepParens({ text }: { text: string }) {
  return text.split(/(\([^()]*\))/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className={styles.nowrap}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/** 카드 묶음 (팀 조직·지역 활동) — 카드가 하나도 없으면 섹션째 숨긴다 */
function CardSection({ title, cards }: { title: string; cards: ReturnType<typeof contentCards> }) {
  if (cards.length === 0) return null;
  return (
    <section>
      <h2 className={styles.h2}>{title}</h2>
      <div className={styles.cards}>
        {cards.map((c) => (
          <div key={c.id} className={styles.card}>
            <h3>{c.title}</h3>
            <ul>
              {c.items.map((i, n) => (
                <li key={n}>
                  <KeepParens text={i} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ClubPage() {
  // 소개 글·배출 국가대표는 관리자 › 구단정보, 사진·섹션 제목·카드는 관리자 › 홈페이지 내용 › 구단소개
  const [{ intro }, alumni, content, organization, community] = await Promise.all([
    getClubSettings(),
    getNationalTeamAlumni(),
    getSiteContent(),
    getContentList("club.organization"),
    getContentList("club.community"),
  ]);
  return (
    <>
      <PageHeader title="구단소개" current="/club" />
      <div className={`container ${styles.body}`}>
        <div className={styles.split}>
          <div className={styles.lead}>
            {intro.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className={styles.figure}>
            <Image src={content["club.photo"]} alt={content["club.photoAlt"]} fill sizes="(max-width: 760px) 100vw, 50vw" />
          </div>
        </div>

        <CardSection title={content["club.section.organization"]} cards={contentCards(organization)} />

        {alumni.length > 0 && (
          <section>
            <h2 className={styles.h2}>{content["club.section.alumni"]}</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.left}>이름</th>
                    <th>포지션</th>
                    <th className={styles.left}>국가대표 발탁</th>
                  </tr>
                </thead>
                <tbody>
                  {alumni.map((a) => (
                    <tr key={a.id}>
                      <td className={styles.left}>{a.name}</td>
                      <td>{a.position}</td>
                      <td className={styles.left}>{a.years}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <CardSection title={content["club.section.community"]} cards={contentCards(community)} />
      </div>
    </>
  );
}
