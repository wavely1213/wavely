import { CompetitionTag, HomeAwayBadge } from "@/components/match/HomeAwayBadge";
import { TeamCrest } from "@/components/match/TeamCrest";
import { buttonClass } from "@/components/ui/Button";
import Link from "next/link";
import { formatKickoff, matchSides } from "@/lib/format";
import { matchLabel } from "@/lib/match";
import type { Match } from "@/types";
import styles from "./NextMatchHero.module.css";

/**
 * 히어로 오른쪽 아래 다음 홈경기 카드 (리디자인 D-067, BR-003 — 상태값 '예정'인 가장 가까운 홈경기).
 * 카드 전체 링크가 아니다 — 버튼 둘([오시는 길] [경기일정])만 링크. 카운트다운 없음(소유자 결정).
 */
export function NextMatchHero({ match, ourName }: { match: Match; ourName: string }) {
  const { date, time } = formatKickoff(match.kickoff);
  const { home, away } = matchSides(match, ourName);
  return (
    <section className={styles.card} data-surface="blue" aria-labelledby="next-home-match">
      <div className={styles.head}>
        <h2 id="next-home-match" className={styles.label}>
          NEXT HOME MATCH
        </h2>
        <CompetitionTag text={matchLabel(match)} surface="blue" />
      </div>
      {/* 홈팀 왼쪽 (BR-002) */}
      <div className={styles.teams}>
        <div className={styles.team}>
          <TeamCrest team={home} us={match.isHome} size={56} />
          <span className={styles.teamName}>{home}</span>
        </div>
        <span className={styles.vs} aria-hidden="true">
          VS
        </span>
        <span className="sr-only">대</span>
        <div className={styles.team}>
          <TeamCrest team={away} us={!match.isHome} size={56} />
          <span className={styles.teamName}>{away}</span>
        </div>
      </div>
      <div className={styles.when}>
        <p className={styles.date}>
          {date} {time}
        </p>
        <p className={styles.venue}>
          {match.venue}
          <HomeAwayBadge isHome={match.isHome} surface="blue" />
        </p>
      </div>
      <div className={styles.buttons}>
        <Link href="/club/location" className={buttonClass("onBlue", styles.button)}>
          오시는 길
        </Link>
        <Link href="/match/schedule" className={buttonClass("onBlueOutline", styles.button)}>
          경기일정
        </Link>
      </div>
    </section>
  );
}
