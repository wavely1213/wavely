import { TeamCrest } from "@/components/match/TeamCrest";
import { TeamName } from "@/components/match/TeamName";
import { ScrollRegion } from "@/components/ui/ScrollRegion";
import type { StandingRow } from "@/types";
import styles from "./StandingsTable.module.css";

/**
 * 리그순위 표 (리디자인 2차 시안, 피그마 StandingsTable 132:1618 / 132:1914) — 연맹 양식 10열(BR-012). rows 는 이미 BR-001 순서.
 * 경기가 없는 팀(개막 전)은 순위 대신 '-' (BR-016). 팀명 앞 엠블럼 24, 우리 팀 행 blue-tint.
 * 휴대폰: 순위와 팀명은 고정, 나머지는 가로 스크롤(넘칠 때만 스크롤 칸에 초점, ScrollRegion).
 * caption: 표 이름(화면 읽기) — 예: '2026-27 FK1리그 순위'.
 */
export function StandingsTable({ rows, caption }: { rows: StandingRow[]; caption: string }) {
  return (
    <ScrollRegion className={styles.wrap} label={caption}>
      <table className={styles.table}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.rank}>
              순위
            </th>
            <th scope="col" className={styles.team}>
              팀명
            </th>
            <th scope="col">경기수</th>
            <th scope="col">승점</th>
            <th scope="col">승</th>
            <th scope="col">무</th>
            <th scope="col">패</th>
            <th scope="col">득점</th>
            <th scope="col">실점</th>
            <th scope="col">득실차</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} className={r.isUs ? styles.us : undefined}>
              <td className={styles.rank}>{r.played === 0 ? "-" : i + 1}</td>
              <th scope="row" className={styles.team}>
                <span className={styles.teamInner}>
                  <TeamCrest team={r.team} us={Boolean(r.isUs)} size={24} />
                  <TeamName name={r.team} className={styles.teamName} />
                </span>
              </th>
              <td>{r.played}</td>
              <td>{r.points}</td>
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
    </ScrollRegion>
  );
}
