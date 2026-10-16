import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StandingsTable } from "@/components/match/StandingsTable";
import { Placeholder } from "@/components/ui/Placeholder";
import { LEAGUE } from "@/config/league";
import { getPastLeagues, getStandings, isLiveData } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "리그순위" };

/** 지금 시즌 순위 + 지난 리그 목록 (BR-016) */
export default async function StandingsPage() {
  const [rows, past] = await Promise.all([getStandings(), getPastLeagues()]);
  const preseason = rows.length > 0 && rows.every((r) => r.played === 0);
  return (
    <>
      <PageHeader title="리그순위" current="/match/standings" />
      <div className={`container ${styles.body}`}>
        <section>
          {isLiveData() && <h2 className={styles.h2}>{LEAGUE.currentCompetition} 순위</h2>}
          {rows.length > 0 ? <StandingsTable rows={rows} /> : <Placeholder label="순위 정보가 없습니다." />}
          <p className={`${styles.note} ${styles.source}`}>
            {preseason && "개막 전 · 팀명 가나다순 · "}순위 기준: 승점 → 득실차 → 다득점
            {isLiveData() && ` · 자료: ${LEAGUE.source}`}
          </p>
        </section>

        {past.length > 0 && (
          <section>
            <h2 className={styles.h2}>지난 리그</h2>
            <ul className={`${styles.list} ${styles.listWide}`}>
              {past.map((l) => (
                <li key={l.slug}>
                  <Link href={`/match/standings/${l.slug}`}>{l.season}</Link>
                  <span>
                    {l.us ? `최종 ${l.us.rank}위 · ${l.us.win}승 ${l.us.draw}무 ${l.us.loss}패` : "최종 순위"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
