import { SITE } from "@/config/site";
import { formatKickoff, matchResult } from "@/lib/format";
import type { Match } from "@/types";
import styles from "./MatchRow.module.css";

const RESULT_LABEL = { W: "승", D: "무", L: "패" } as const;

export function MatchRow({ match }: { match: Match }) {
  const { date, time } = formatKickoff(match.kickoff);
  const result = matchResult(match);
  const [left, right] = match.isHome ? [SITE.name, match.opponent] : [match.opponent, SITE.name];
  const score = match.score
    ? match.isHome
      ? `${match.score.us} : ${match.score.them}`
      : `${match.score.them} : ${match.score.us}`
    : "VS";

  return (
    <li className={styles.row}>
      <div className={styles.when}>
        <strong>{date}</strong>
        <span>
          {time} · {match.round}
        </span>
      </div>
      <div className={styles.versus}>
        <span className={styles.team}>{left}</span>
        <span className={styles.score}>{score}</span>
        <span className={styles.team}>{right}</span>
      </div>
      <div className={styles.meta}>
        <span className={match.isHome ? styles.home : styles.away}>{match.isHome ? "HOME" : "AWAY"}</span>
        {result && <span className={`${styles.result} ${styles[result]}`}>{RESULT_LABEL[result]}</span>}
        <span className={styles.venue}>{match.venue}</span>
      </div>
    </li>
  );
}
