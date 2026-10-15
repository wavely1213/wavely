import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { MatchRow } from "@/lib/data/rows";
import { formatKickoff } from "@/lib/format";
import local from "./matches.module.css";

export const metadata: Metadata = { title: "경기" };

export default function MatchesAdminPage() {
  return (
    <>
      <PageTitle
        title="경기"
        description="경기일정·경기결과·메인 페이지에 보입니다. 상태를 '종료'로 바꾸고 스코어를 넣으면 경기결과로 옮겨집니다."
      >
        <Link href="/admin/matches/new" className={styles.button}>
          + 경기 추가
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <MatchLists />
      </Suspense>
    </>
  );
}

async function MatchLists() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase.from("matches").select("*").order("kickoff").returns<MatchRow[]>();
  const rows = data ?? [];
  const upcoming = rows.filter((m) => m.status === "scheduled");
  const finished = rows.filter((m) => m.status === "finished").reverse();

  return (
    <>
      <section className={local.section}>
        <h2 className={styles.panelTitle}>예정</h2>
        <MatchTable rows={upcoming} empty="예정된 경기가 없습니다." />
      </section>
      <section className={local.section}>
        <h2 className={styles.panelTitle}>종료</h2>
        <MatchTable rows={finished} empty="종료된 경기가 없습니다." />
      </section>
    </>
  );
}

function MatchTable({ rows, empty }: { rows: MatchRow[]; empty: string }) {
  if (rows.length === 0) return <p className={`${styles.panel} ${styles.empty}`}>{empty}</p>;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>일시</th>
            <th>라운드</th>
            <th>홈/원정</th>
            <th>상대</th>
            <th>스코어(우리:상대)</th>
            <th>장소</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const { date, time } = formatKickoff(m.kickoff);
            return (
              <tr key={m.id}>
                <td>
                  {date} {time}
                </td>
                <td>{m.round || "-"}</td>
                <td>
                  <span className={m.is_home ? `${styles.badge} ${styles.badgeBlue}` : styles.badge}>
                    {m.is_home ? "홈" : "원정"}
                  </span>
                </td>
                <td>
                  <Link href={`/admin/matches/${m.id}`} className={styles.rowLink}>
                    {m.opponent}
                  </Link>
                </td>
                <td>{m.score_us !== null && m.score_them !== null ? `${m.score_us} : ${m.score_them}` : "-"}</td>
                <td>{m.venue || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
