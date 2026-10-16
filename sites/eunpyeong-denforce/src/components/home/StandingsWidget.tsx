import Link from "next/link";
import { LEAGUE } from "@/config/league";
import type { StandingRow } from "@/types";
import styles from "./StandingsWidget.module.css";

/**
 * 메인 오른쪽 '리그 순위' 위젯 (D-034) — 지금 시즌 표를 순위·팀·경기·승점만 줄여 보여 준다.
 * rows 는 이미 BR-001 순서. 경기가 없는 팀(개막 전)은 순위 대신 '-' (BR-016, 리그순위 페이지와 같음).
 */
export function StandingsWidget({ rows }: { rows: StandingRow[] }) {
  const beforeKickoff = rows.every((r) => r.played === 0);
  return (
    <section className={styles.widget} aria-labelledby="standings-widget-title">
      <div className={styles.head}>
        <h2 id="standings-widget-title" className={styles.title}>
          리그 순위
        </h2>
        <Link href="/match/standings" className={styles.more}>
          전체보기<span className="sr-only"> 리그 순위</span>
        </Link>
      </div>
      <p className={styles.season}>{LEAGUE.currentCompetition}</p>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">순위</th>
            <th scope="col" className={styles.team}>
              팀
            </th>
            <th scope="col">경기</th>
            <th scope="col">승점</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={r.isUs ? styles.us : undefined}>
              <td>{r.played === 0 ? "-" : i + 1}</td>
              <td className={styles.team}>{r.team}</td>
              <td>{r.played}</td>
              <td className={styles.points}>{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {beforeKickoff && <p className={styles.note}>개막 전 · 팀명 가나다순</p>}
    </section>
  );
}
