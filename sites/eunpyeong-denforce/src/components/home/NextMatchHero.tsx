import { CompetitionTag, HomeAwayBadge } from "@/components/match/HomeAwayBadge";
import { TeamCrest } from "@/components/match/TeamCrest";
import { buttonClass } from "@/components/ui/Button";
import Link from "next/link";
import { formatKickoff, matchSides } from "@/lib/format";
import { matchLabel } from "@/lib/match";
import type { Match } from "@/types";
import styles from "./NextMatchHero.module.css";

/**
 * 히어로 사진 위 다음 홈경기 카드 — 가운데 정렬 (소유자 확정 2026-11-10, 피그마 200:20880, BR-003 '예정'인 가장 가까운 홈경기).
 * 순서: 라벨 → [홈 엠블럼 | VS | 원정 엠블럼] + 이름 → 대회 → 날짜/시각 → @경기장 + HOME → 버튼 둘.
 * 검정 카드, 홈팀(왼쪽, BR-002) 엠블럼 뒤만 파랑 사선 면, 오른쪽 아래 큰 E 외곽선(둘 다 꾸밈이라 읽지 않음).
 * 카드 전체 링크가 아니다 — 버튼 둘([오시는 길] [경기일정])만 링크. 카운트다운 없음.
 */
export function NextMatchHero({ match, ourName }: { match: Match; ourName: string }) {
  const { date, time } = formatKickoff(match.kickoff);
  const { home, away } = matchSides(match, ourName);
  return (
    <section className={styles.card} data-surface="dark" aria-labelledby="next-home-match">
      <span className={styles.watermark} aria-hidden="true">
        E
      </span>
      <h2 id="next-home-match" className={styles.label}>
        NEXT HOME MATCH
      </h2>
      <div className={styles.teams}>
        <div className={`${styles.team} ${styles.homeTeam}`}>
          <TeamCrest team={home} us={match.isHome} size={96} mobileSize={64} />
          <span className={styles.teamName}>{home}</span>
        </div>
        <span className={styles.vs} aria-hidden="true">
          VS
        </span>
        <span className="sr-only">대</span>
        <div className={styles.team}>
          <TeamCrest team={away} us={!match.isHome} size={96} mobileSize={64} />
          <span className={styles.teamName}>{away}</span>
        </div>
      </div>
      <CompetitionTag text={matchLabel(match)} surface="dark" />
      <p className={styles.date}>
        {date} {time}
      </p>
      {match.venue && (
        <p className={styles.venue}>
          @{match.venue}
          <HomeAwayBadge isHome={match.isHome} surface="dark" />
        </p>
      )}
      <div className={styles.buttons}>
        <Link href="/club/location" className={buttonClass("onBlue", styles.button)}>
          오시는 길
        </Link>
        <Link href="/match/schedule" className={buttonClass("onDarkOutline", styles.button)}>
          경기일정
        </Link>
      </div>
    </section>
  );
}
