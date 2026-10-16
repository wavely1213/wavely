import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { LEAGUE } from "@/config/league";
import { requireAdminPage } from "@/lib/admin/auth";
import { toStanding, type StandingDbRow } from "@/lib/data/rows";
import { byRank } from "@/lib/standings";
import type { StandingRow } from "@/types";

export const metadata: Metadata = { title: "리그순위" };

export default function StandingsAdminPage() {
  return (
    <>
      <PageTitle
        title="리그순위"
        description={`시즌별로 공개 리그순위와 같은 순서(승점 → 득실차 → 다득점)로 보입니다. 지금 시즌(${LEAGUE.currentCompetition}) 표가 공개 리그순위에, 나머지는 '지난 리그'에 보입니다. 경기 수·승점(승3·무1)은 자동 계산됩니다.`}
      >
        <Link href="/admin/standings/new" className={styles.button}>
          + 팀 추가
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <StandingList />
      </Suspense>
    </>
  );
}

/** 시즌별 표 — 지금 시즌 먼저, 나머지는 최근 시즌 먼저. 표 안은 BR-001 (lib/standings byRank, 공개 화면과 같은 정렬) */
function groupBySeason(rows: StandingRow[]) {
  const seasons = [...new Set(rows.map((r) => r.season))].sort((a, b) =>
    a === LEAGUE.currentCompetition ? -1 : b === LEAGUE.currentCompetition ? 1 : b.localeCompare(a),
  );
  return seasons.map((season) => ({ season, rows: rows.filter((r) => r.season === season).sort(byRank) }));
}

async function StandingList() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase.from("standings").select("*").returns<StandingDbRow[]>();
  const groups = groupBySeason((data ?? []).map(toStanding));

  if (groups.length === 0) return <p className={`${styles.panel} ${styles.empty}`}>등록된 팀이 없습니다.</p>;

  return groups.map(({ season, rows }) => (
    <section key={season} className={styles.panel}>
      <h2 className={styles.panelTitle}>
        {season}
        {season === LEAGUE.currentCompetition ? " (지금 시즌)" : " (지난 리그)"}
      </h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>순위</th>
              <th>팀</th>
              <th>경기</th>
              <th>승</th>
              <th>무</th>
              <th>패</th>
              <th>득점</th>
              <th>실점</th>
              <th>득실</th>
              <th>승점</th>
              <th>우리팀</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>{r.played === 0 ? "-" : i + 1}</td>
                <td>
                  <Link href={`/admin/standings/${r.id}`} className={styles.rowLink}>
                    {r.team}
                  </Link>
                </td>
                <td>{r.played}</td>
                <td>{r.win}</td>
                <td>{r.draw}</td>
                <td>{r.loss}</td>
                <td>{r.goalsFor}</td>
                <td>{r.goalsAgainst}</td>
                <td>{r.goalsFor - r.goalsAgainst}</td>
                <td>
                  <strong>{r.points}</strong>
                </td>
                <td>{r.isUs && <span className={`${styles.badge} ${styles.badgeBlue}`}>우리팀</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  ));
}
