import { CompetitionTag, HomeAwayBadge } from "@/components/match/HomeAwayBadge";
import { TeamCrest } from "@/components/match/TeamCrest";
import { TeamName } from "@/components/match/TeamName";
import { buttonClass } from "@/components/ui/Button";
import Link from "next/link";
import type { CSSProperties } from "react";
import { formatKickoff, matchSides } from "@/lib/format";
import { matchLabel } from "@/lib/match";
import type { Match } from "@/types";
import styles from "./NextMatchHero.module.css";

/**
 * 히어로 사진 위 다음 홈경기 카드 — v2 ② 좌우 분할 (소유자 확정 2026-11-11, 피그마 PC 223:24911 / 휴대폰 223:25069, BR-003 '예정'인 가장 가까운 홈경기).
 * 순서(PC, A 세로 압축 2026-11-13): 라벨 → [홈 엠블럼 | VS | 원정 엠블럼] + 이름 → 날짜/시각 → [대회 + @경기장 + HOME] 한 줄 → 버튼 둘.
 * 휴대폰은 그대로: 라벨 → 대진 → 대회 → 날짜 → @경기장 + HOME → 버튼.
 * 검정 카드의 왼쪽 반(홈팀 쪽, BR-002)이 파랑 — 경계는 VS 가운데를 지나는 사선, 그라데이션 없음.
 * 721 이상(태블릿, PC): 카드 전체 링크가 아니다 — 버튼 둘([오시는 길] [경기일정])만 링크. 카운트다운 없음.
 * 720 이하(휴대폰): 작은 띠 A 가운데 3줄(D-088) — PhoneStrip. 카드 전체가 링크 하나(/match/schedule), 버튼 없음.
 */
export function NextMatchHero({ match, ourName, texture }: { match: Match; ourName: string; texture?: string }) {
  const style = texture ? ({ "--nmh-texture": `url(${JSON.stringify(texture)})` } as CSSProperties) : undefined;
  return (
    <>
      <WideCard match={match} ourName={ourName} textured={Boolean(texture)} style={style} />
      <PhoneStrip match={match} ourName={ourName} textured={Boolean(texture)} style={style} />
    </>
  );
}

type Props = { match: Match; ourName: string; textured: boolean; style?: CSSProperties };

function WideCard({ match, ourName, textured, style }: Props) {
  const { date, time } = formatKickoff(match.kickoff);
  const { home, away } = matchSides(match, ourName);
  return (
    <section
      className={`${styles.card} ${styles.wide} ${textured ? styles.textured : ""}`}
      data-surface="dark"
      aria-labelledby="next-home-match"
      // 파란 반쪽 듀오톤 질감 사진 (소유자 '(다) 구단 사진 듀오톤', 디자인 be0917e) — 없으면 평면 파랑
      style={style}
    >
      <h2 id="next-home-match" className={styles.label}>
        NEXT HOME MATCH
      </h2>
      <div className={styles.teams}>
        <div className={styles.team}>
          <TeamCrest team={home} us={match.isHome} size={112} mobileSize={72} />
          <TeamName name={home} className={styles.teamName} />
        </div>
        <span className={styles.vs} aria-hidden="true">
          VS
        </span>
        <span className="sr-only">대</span>
        <div className={styles.team}>
          <TeamCrest team={away} us={!match.isHome} size={112} mobileSize={72} />
          <TeamName name={away} className={styles.teamName} />
        </div>
      </div>
      <p className={styles.date}>
        {date} {time}
      </p>
      {/* PC: 대회 태그 + @장소 + HOME 한 줄 (A 세로 압축, D-077). 휴대폰은 풀어서 태그 → 날짜 → 장소 순서 그대로 */}
      <div className={styles.meta}>
        <CompetitionTag text={matchLabel(match)} surface="dark" />
        {match.venue && (
          <p className={styles.venue}>
            @{match.venue}
            <HomeAwayBadge isHome={match.isHome} surface="dark" />
          </p>
        )}
      </div>
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

/**
 * 휴대폰 작은 띠 A 가운데 3줄 (D-088, 피그마 274:26717 / 274:26795 / 274:26873 / 274:26951) — 폭 화면 - 32.
 * [NEXT HOME MATCH + 날짜] / [엠블럼 32 + 우리 이름, VS, 상대 이름 + 엠블럼] / [대회 + (@장소 + HOME + →)] — 줄 규칙은 KFA고딕 실측 기준(I-062, 디자인 f46f3d6).
 * 카드 전체가 /match/schedule 링크 하나. 읽기 프로그램에는 대진, 날짜, 장소를 담은 이름을 준다(→ 는 숨김).
 */
function PhoneStrip({ match, ourName, textured, style }: Props) {
  const { date, time } = formatKickoff(match.kickoff);
  const { home, away } = matchSides(match, ourName);
  const name = [
    `다음 홈경기 ${home} 대 ${away}`,
    `${date} ${time}`,
    match.venue ? `${match.venue}${match.isHome ? " 홈" : ""}` : null,
    "경기일정 보기",
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <section className={styles.stripWrap} data-surface="dark" aria-label="다음 홈경기">
      <Link href="/match/schedule" className={`${styles.card} ${styles.strip} ${textured ? styles.textured : ""}`} style={style} aria-label={name}>
        <span className={styles.stripRow}>
          <span className={styles.label}>NEXT HOME MATCH</span>
          <span className={styles.stripDate}>
            {date} {time}
          </span>
        </span>
        <span className={styles.stripTeams}>
          <span className={styles.stripTeam}>
            <TeamCrest team={home} us={match.isHome} size={32} />
            <TeamName name={home} className={styles.stripName} />
          </span>
          <span className={styles.stripVs}>VS</span>
          <span className={styles.stripTeam}>
            <TeamName name={away} className={styles.stripName} />
            <TeamCrest team={away} us={!match.isHome} size={32} />
          </span>
        </span>
        <span className={styles.stripRow}>
          <CompetitionTag text={matchLabel(match)} surface="dark" />
          <span className={styles.venue}>
            {match.venue && <>@{match.venue}</>}
            <HomeAwayBadge isHome={match.isHome} surface="dark" />
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
          </span>
        </span>
      </Link>
    </section>
  );
}
