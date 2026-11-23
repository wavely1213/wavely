import Link from "next/link";
import { TeamName } from "@/components/match/TeamName";
import { LEAGUE } from "@/config/league";
import type { StandingRow } from "@/types";
import styles from "./StandingsWidget.module.css";

/**
 * 메인 '리그 순위' 위젯 (리디자인 D-067, D-034 변경: 4열 → 7열) — 순위, 팀, 경기, 승점, 승, 무, 패 (BR-012 순서).
 * rows 는 이미 BR-001 순서. 경기가 없는 팀(개막 전)은 순위 대신 '-' 와 '개막 전 / 팀명 가나다순' (BR-016).
 * live: 실데이터일 때만 '자료: 한국풋살연맹' (BR-008).
 */
export function StandingsWidget({ rows, title, live = false }: { rows: StandingRow[]; title: string; live?: boolean }) {
  const beforeKickoff = rows.every((r) => r.played === 0);
  return (
    <section className={styles.widget} aria-labelledby="standings-widget-title">
      <div className={styles.head}>
        <h2 id="standings-widget-title" className={styles.title}>
          {title}
        </h2>
        <Link href="/match/standings" className={styles.more}>
          전체보기<span className="sr-only"> {title}</span> <span aria-hidden="true">→</span>
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
            <th scope="col">승</th>
            <th scope="col">무</th>
            <th scope="col">패</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={r.isUs ? styles.us : undefined}>
              <td>{r.played === 0 ? "-" : i + 1}</td>
              <td className={styles.team}>
                <TeamName name={r.team} />
              </td>
              <td>{r.played}</td>
              <td className={styles.points}>{r.points}</td>
              <td>{r.win}</td>
              <td>{r.draw}</td>
              <td>{r.loss}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(beforeKickoff || live) && (
        <div className={styles.foot}>
          {beforeKickoff && <p className={styles.note}>개막 전 / 팀명 가나다순</p>}
          {live && <p className={styles.note}>자료: 한국풋살연맹</p>}
        </div>
      )}
    </section>
  );
}
