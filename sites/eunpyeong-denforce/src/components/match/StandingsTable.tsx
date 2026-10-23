import styles from "@/styles/prose.module.css";
import type { StandingRow } from "@/types";

// 리그순위 표 — 연맹 양식 열 순서 (BR-012). rows 는 이미 BR-001 순서.
// 경기가 없는 팀(개막 전)은 순위 대신 '-' (BR-016).

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>순위</th>
            <th className={styles.left}>팀명</th>
            <th>경기수</th>
            <th>승점</th>
            <th>승</th>
            <th>무</th>
            <th>패</th>
            <th>득점</th>
            <th>실점</th>
            <th>득실차</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={r.isUs ? styles.highlight : undefined}>
              <td>{r.played === 0 ? "-" : i + 1}</td>
              <td className={styles.left}>{r.team}</td>
              <td>{r.played}</td>
              <td>
                <strong>{r.points}</strong>
              </td>
              <td>{r.win}</td>
              <td>{r.draw}</td>
              <td>{r.loss}</td>
              <td>{r.goalsFor}</td>
              <td>{r.goalsAgainst}</td>
              <td>{r.goalsFor - r.goalsAgainst}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
