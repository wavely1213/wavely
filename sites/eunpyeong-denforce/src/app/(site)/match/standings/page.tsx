import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StandingsTable } from "@/components/match/StandingsTable";
import { Placeholder } from "@/components/ui/Placeholder";
import { LEAGUE } from "@/config/league";
import { pageMetadata } from "@/lib/page-meta";
import { getPastLeagues, getSiteContent, getStandings, isLiveData } from "@/lib/repo";
import styles from "./standings.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("리그순위", "/match/standings");
}

/** 지금 시즌 순위 + 지난 리그 목록 (BR-016) */
export default async function StandingsPage() {
  const [rows, past, content] = await Promise.all([getStandings(), getPastLeagues(), getSiteContent()]);
  const preseason = rows.length > 0 && rows.every((r) => r.played === 0);
  return (
    <>
      <PageHeader title="리그순위" current="/match/standings" />
      <div className={`container ${styles.body}`}>
        <section>
          {isLiveData() && <h2 className={styles.h2}>{LEAGUE.currentCompetition} 순위</h2>}
          {rows.length > 0 ? <StandingsTable rows={rows} caption={`${LEAGUE.currentCompetition} 순위`} /> : <Placeholder label={content["standings.empty"]} />}
          <p className={styles.note}>
            {preseason && "개막 전 / 팀명 가나다순 / "}
            {content["standings.basis"]}
            {isLiveData() && ` / 자료: ${LEAGUE.source}`}
          </p>
        </section>

        {/* 지난 리그 — 시즌 칩(BR-016), 0개면 숨김 */}
        {past.length > 0 && (
          <section>
            <h2 className={styles.h2}>{content["standings.section.past"]}</h2>
            <ul className={styles.past}>
              {past.map((l) => (
                <li key={l.slug}>
                  <Link href={`/match/standings/${l.slug}`} className={styles.pastLink}>
                    <span className={styles.pastText}>
                      <span>{l.season}</span>
                      {/* BR-016: 우리 팀 최종 성적을 칩 안에 작게 */}
                      <span className={styles.pastMeta}>
                        {l.us ? `최종 ${l.us.rank}위 / ${l.us.win}승 ${l.us.draw}무 ${l.us.loss}패` : "최종 순위"}
                      </span>
                    </span>
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
