import Link from "next/link";
import { formatKickoff, matchResult, matchSides, RESULT_LABEL } from "@/lib/format";
import { matchLabel } from "@/lib/match";
import { getSiteContent } from "@/lib/repo";
import type { Match } from "@/types";
import styles from "./MatchCard.module.css";

/** 메인용 경기 카드 (지난 경기 / 다음 경기) */
export function MatchCard({ match, label, ourName }: { match: Match; label: string; ourName: string }) {
  const { date, time } = formatKickoff(match.kickoff);
  const result = matchResult(match);
  const { home, away, score } = matchSides(match, ourName);
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
        {matchLabel(match)}
        <br />
        {date} {time}
        {match.venue && ` · ${match.venue}`}
      </p>
    </Link>
  );
}

/** 우리 팀 이름은 관리자 › 홈페이지 내용 › 기본 정보 '구단 이름' (D-046) */
export async function MatchCards({ items }: { items: Array<{ match: Match; label: string }> }) {
  const ourName = (await getSiteContent())["site.name"];
  return (
    <div className={styles.list}>
      {items.map(({ match, label }) => (
        <MatchCard key={match.id} match={match} label={label} ourName={ourName} />
      ))}
    </div>
  );
}
