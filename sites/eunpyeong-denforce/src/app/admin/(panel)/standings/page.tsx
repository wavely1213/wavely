import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { StandingDbRow } from "@/lib/data/rows";

export const metadata: Metadata = { title: "리그순위" };

export default function StandingsAdminPage() {
  return (
    <>
      <PageTitle
        title="리그순위"
        description="공개 리그순위와 같은 순서(승점 → 득실차 → 다득점)로 보입니다. 경기 수·승점(승3·무1)은 자동 계산됩니다."
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

const goalDiff = (r: StandingDbRow) => r.goals_for - r.goals_against;

/** BR-001: 승점 → 득실차 → 다득점 (lib/repo.ts getStandings 와 같은 정렬) */
const byRank = (a: StandingDbRow, b: StandingDbRow) =>
  b.points - a.points || goalDiff(b) - goalDiff(a) || b.goals_for - a.goals_for;

async function StandingList() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase.from("standings").select("*").returns<StandingDbRow[]>();
  const rows = [...(data ?? [])].sort(byRank);

  if (rows.length === 0) return <p className={`${styles.panel} ${styles.empty}`}>등록된 팀이 없습니다.</p>;

  return (
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
              <td>{i + 1}</td>
              <td>
                <Link href={`/admin/standings/${r.id}`} className={styles.rowLink}>
                  {r.team}
                </Link>
              </td>
              <td>{r.played}</td>
              <td>{r.win}</td>
              <td>{r.draw}</td>
              <td>{r.loss}</td>
              <td>{r.goals_for}</td>
              <td>{r.goals_against}</td>
              <td>{goalDiff(r)}</td>
              <td>
                <strong>{r.points}</strong>
              </td>
              <td>{r.is_us && <span className={`${styles.badge} ${styles.badgeBlue}`}>우리팀</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
