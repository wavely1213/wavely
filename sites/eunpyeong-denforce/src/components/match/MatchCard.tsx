import Link from "next/link";
import { SITE } from "@/config/site";
import { formatKickoff, matchResult, matchSides, RESULT_LABEL } from "@/lib/format";
import type { Match } from "@/types";
import styles from "./MatchCard.module.css";

/** 메인용 경기 카드 (지난 경기 / 다음 경기) */
export function MatchCard({ match, label }: { match: Match; label: string }) {
  const { date, time } = formatKickoff(match.kickoff);
  const result = matchResult(match);
  const { home, away, score } = matchSides(match, SITE.name);
  const href = match.status === "finished" ? "/match/results" : "/match/schedule";

  return (
    <Link href={href} className={styles.card}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {result && <span className={`${styles.result} ${styles[result]}`}>{RESULT_LABEL[result]}</span>}
      </div>
      <div className={styles.teams}>
        <span>{home}</span>
        <strong className={score ? styles.score : styles.vs}>{score ? `${score[0]} : ${score[1]}` : "VS"}</strong>
        <span>{away}</span>
      </div>
      <p className={styles.meta}>
        {date} {time} · {match.round}
        <br />
        {match.venue}
      </p>
    </Link>
  );
}

export function MatchCards({ items }: { items: Array<{ match: Match; label: string }> }) {
  return (
    <div className={styles.list}>
      {items.map(({ match, label }) => (
        <MatchCard key={match.id} match={match} label={label} />
      ))}
    </div>
  );
}
