import Link from "next/link";
import { CompetitionTag, HomeAwayBadge } from "@/components/match/HomeAwayBadge";
import { ResultBadge } from "@/components/match/ResultBadge";
import { TeamCrest } from "@/components/match/TeamCrest";
import { TeamName } from "@/components/match/TeamName";
import { formatKickoff, matchResult, matchSides } from "@/lib/format";
import { matchLabel, matchVideoLinks } from "@/lib/match";
import type { Match } from "@/types";
import styles from "./MatchCard.module.css";

/**
 * 메인 경기 띠의 한 칸 (리디자인 D-067, 검정 면). 결과: 스코어 + 결과 배지 + 득점 줄 + 있을 때만 영상 버튼(새 창).
 * 예정: 가운데 시각. 칸마다 가운데 정렬(수원식, 피그마 200:21536 / 200:21621): 라벨 → 대회 → 대진 → 날짜 → @경기장 + HOME → 득점 → 영상. 홈팀 왼쪽(BR-002), 홈경기만 HOME. 카드 전체가 아니라 대진 줄만 링크(버튼이 든 카드라서).
 */
export function MatchCard({ match, label, ourName, divided = false }: { match: Match; label: string; ourName: string; divided?: boolean }) {
  const { date, time } = formatKickoff(match.kickoff);
  const result = matchResult(match);
  const { home, away, score } = matchSides(match, ourName);
  const finished = match.status === "finished";
  const videos = finished ? matchVideoLinks(match, ourName) : [];

  return (
    <article className={`${styles.card} ${divided ? styles.divided : ""}`}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <CompetitionTag text={matchLabel(match)} surface="dark" />
      </div>
      <Link href={finished ? "/match/results" : "/match/schedule"} className={styles.teams}>
        <span className={styles.team}>
          <TeamCrest team={home} us={match.isHome} size={56} mobileSize={40} />
          <TeamName name={home} className={styles.teamName} />
        </span>
        <span className={styles.center}>
          {score ? (
            <>
              <strong className={styles.number}>
                {score[0]} : {score[1]}
              </strong>
              {result && <ResultBadge result={result} />}
            </>
          ) : (
            <strong className={styles.number}>{time}</strong>
          )}
        </span>
        <span className={styles.team}>
          <TeamCrest team={away} us={!match.isHome} size={56} mobileSize={40} />
          <TeamName name={away} className={styles.teamName} />
        </span>
      </Link>
      <p className={styles.date}>{finished ? `${date} ${time}` : date}</p>
      {match.venue && (
        <p className={styles.venue}>
          @{match.venue}
          <HomeAwayBadge isHome={match.isHome} surface="dark" />
        </p>
      )}
      {finished && match.scorers && (
        <p className={styles.scorers}>
          <span className={styles.scorersLabel}>득점</span>
          {match.scorers}
        </p>
      )}
      {videos.length > 0 && (
        <div className={styles.videos}>
          {videos.map((v) => (
            <a key={v.kind} href={v.url} target="_blank" rel="noopener noreferrer" className={styles.video} aria-label={v.ariaLabel}>
              {v.label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
