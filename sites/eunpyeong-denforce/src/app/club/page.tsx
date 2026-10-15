import type { Metadata } from "next";
import Image from "next/image";
import { PageHeader } from "@/components/layout/PageHeader";
import { CLUB_INTRO, COMMUNITY, NATIONAL_TEAM_ALUMNI, ORGANIZATION } from "@/data/club";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "구단소개" };

export default function ClubPage() {
  return (
    <>
      <PageHeader title="구단소개" current="/club" />
      <div className={`container ${styles.body}`}>
        <div className={styles.split}>
          <div className={styles.lead}>
            {CLUB_INTRO.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className={styles.figure}>
            <Image src="/photos/superleague-2021-runnerup.webp" alt="2020-21 슈퍼리그 준우승 기념 사진" fill sizes="(max-width: 760px) 100vw, 50vw" />
          </div>
        </div>

        <section>
          <h2 className={styles.h2}>팀 조직</h2>
          <div className={styles.cards}>
            {ORGANIZATION.map((o) => (
              <div key={o.group} className={styles.card}>
                <h3>{o.group}</h3>
                <ul>
                  {o.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className={styles.h2}>배출 풋살 국가대표</h2>
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
                {NATIONAL_TEAM_ALUMNI.map((a) => (
                  <tr key={a.name}>
                    <td className={styles.left}>{a.name}</td>
                    <td>{a.position}</td>
                    <td className={styles.left}>{a.years}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className={styles.h2}>지역 활동</h2>
          <div className={styles.cards}>
            {COMMUNITY.map((c) => (
              <div key={c.group} className={styles.card}>
                <h3>{c.group}</h3>
                <ul>
                  {c.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
