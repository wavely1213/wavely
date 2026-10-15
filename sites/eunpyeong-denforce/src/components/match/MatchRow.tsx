import { SITE } from "@/config/site";
import { formatKickoff, matchResult, matchSides, RESULT_LABEL } from "@/lib/format";
import type { Match } from "@/types";
import styles from "./MatchRow.module.css";

/** 경기 목록 한 줄 (일정·결과 페이지) */
export function MatchRow({ match }: { match: Match }) {
  const { date, time } = formatKickoff(match.kickoff);
  const result = matchResult(match);
  const { home, away, score } = matchSides(match, SITE.name);

  return (
    <li className={styles.row}>
      <div className={styles.when}>
        <strong>{date}</strong>
        <span>
          {time}
          {match.round && ` · ${match.round}`}
        </span>
      </div>
      <div className={styles.versus}>
        <span className={styles.home}>{home}</span>
        <span className={score ? styles.score : styles.vs}>{score ? `${score[0]} : ${score[1]}` : "VS"}</span>
        <span className={styles.away}>{away}</span>
      </div>
      <div className={styles.meta}>
        {result ? (
          <span className={`${styles.result} ${styles[result]}`}>{RESULT_LABEL[result]}</span>
        ) : (
          <span className={styles.side}>{match.isHome ? "HOME" : "AWAY"}</span>
        )}
        <span className={styles.venue}>{match.venue}</span>
      </div>
    </li>
  );
}
