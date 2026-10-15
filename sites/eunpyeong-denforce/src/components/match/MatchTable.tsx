import { SITE } from "@/config/site";
import { formatKickoffFull, matchResult, matchSides, RESULT_LABEL } from "@/lib/format";
import { groupByCompetition } from "@/lib/match";
import prose from "@/styles/prose.module.css";
import type { Match } from "@/types";
import styles from "./MatchTable.module.css";

/**
 * 경기일정·결과 표 — 한국풋살연맹 경기일정 양식(경기번호·일정·대진표·장소·결과).
 * 경기번호 칸은 라운드로 대신한다. 대회별로 표를 나눈다 (BR-011).
 * 모바일은 3칸(일정·대진·결과)으로 줄이고 라운드는 일정 칸에, 홈·원정은 위아래로 놓는다.
 */
export function MatchTable({ matches }: { matches: Match[] }) {
  return groupByCompetition(matches).map((g, i) => (
    <section key={`${i}-${g.competition}`} className={styles.group}>
      <h2 className={styles.title}>{g.competition}</h2>
      <div className={prose.tableWrap}>
        <table className={`${prose.table} ${styles.table}`}>
          <thead>
            <tr>
              <th className={styles.round}>라운드</th>
              <th className={styles.when}>경기일정</th>
              <th>경기 대진표</th>
              <th className={styles.venue}>경기장소</th>
              <th className={styles.result}>결과</th>
            </tr>
          </thead>
          <tbody>
            {g.matches.map((m) => (
              <MatchTableRow key={m.id} match={m} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  ));
}

function MatchTableRow({ match }: { match: Match }) {
  const { date, time } = formatKickoffFull(match.kickoff);
  const { home, away, score } = matchSides(match, SITE.name);
  const result = matchResult(match);
  // 홈팀이 왼쪽 (BR-002), 우리 팀 이름은 강조
  const [homeClass, awayClass] = match.isHome ? [styles.us, undefined] : [undefined, styles.us];

  return (
    <tr>
      <td className={styles.round}>{match.round || "-"}</td>
      <td>
        {date}{" "}
        <span className={styles.time}>
          {time}
          {match.round && <span className={styles.mobileRound}> · {match.round}</span>}
        </span>
      </td>
      <td>
        <span className={styles.versus}>
          <span className={`${styles.home} ${homeClass ?? ""}`}>{home}</span>
          <span className={styles.vs}>vs</span>
          <span className={awayClass}>{away}</span>
        </span>
      </td>
      <td className={styles.venue}>{match.venue || "-"}</td>
      <td className={styles.score}>
        {score ? (
          // 승·무·패를 색 박스로 구분 (색만으로 전달하지 않도록 글자도 숨겨 둔다)
          <span className={`${styles.scoreBox} ${result ? styles[result] : ""}`}>
            {result && <span className="sr-only">{RESULT_LABEL[result]} </span>}
            {score[0]} : {score[1]}
          </span>
        ) : (
          "-"
        )}
      </td>
    </tr>
  );
}
