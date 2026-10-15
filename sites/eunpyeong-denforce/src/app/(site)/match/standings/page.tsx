import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { getStandings } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "리그순위" };

export default async function StandingsPage() {
  const rows = await getStandings();
  return (
    <>
      <PageHeader title="리그순위" current="/match/standings" />
      <div className="container">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>순위</th>
                <th className={styles.left}>팀</th>
                <th>경기</th>
                <th>승</th>
                <th>무</th>
                <th>패</th>
                <th>득점</th>
                <th>실점</th>
                <th>득실</th>
                <th>승점</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.team} className={r.isUs ? styles.highlight : undefined}>
                  <td>{i + 1}</td>
                  <td className={styles.left}>{r.team}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.note}>순위 기준: 승점 → 득실차 → 다득점</p>
      </div>
    </>
  );
}
