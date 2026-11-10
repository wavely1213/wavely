import { HomeAwayBadge } from "@/components/match/HomeAwayBadge";
import { TeamCrest } from "@/components/match/TeamCrest";
import { TeamName } from "@/components/match/TeamName";
import { formatKickoffFull, matchResult, matchSides, RESULT_LABEL } from "@/lib/format";
import { groupByCompetition, hasMatchDetails, matchVideoLinks } from "@/lib/match";
import { getSiteContent } from "@/lib/repo";
import type { Match } from "@/types";
import styles from "./MatchTable.module.css";

/**
 * 경기일정/결과 표 (리디자인 2차 시안, 피그마 MatchTable Row 131:813) — 대회별로 표를 나눈다 (BR-011).
 * PC 5칸: 라운드 / 경기일정(날짜 + 시각) / 대진표([홈 이름 + 엠블럼 | vs | 엠블럼 + 원정 이름], 모든 행의 vs 가 같은 세로선) / 경기장소(HOME 배지 + 장소) / 결과.
 * 휴대폰 3칸(D-012): 일시(라운드, 월-일, 시각) / 대진(홈 줄, 원정 줄, 장소 줄 + HOME) / 결과.
 * 홈팀 왼쪽(위) (BR-002), HOME 배지는 홈경기만. nextId: 경기일정의 다음 경기 행(blue-tint).
 * details: 경기결과 — 종료 경기 대진 아래 득점 줄과 [하이라이트] [다시보기](있을 때만, 새 창).
 * 따로 줄(tr)을 두지 않고 대진 칸 안에 둔다: 휴대폰에서 라운드/장소 칸을 숨겨 colspan 이 맞지 않기 때문.
 */
export async function MatchTable({
  matches,
  details = false,
  nextId,
  headingLevel = 2,
}: {
  matches: Match[];
  details?: boolean;
  nextId?: string;
  /** 대회 이름 제목 단계 — 다른 제목('경기 결과') 아래에 둘 때 3 */
  headingLevel?: 2 | 3;
}) {
  const ourName = (await getSiteContent())["site.name"];
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return groupByCompetition(matches).map((g, i) => (
    <section key={`${i}-${g.competition}`} className={styles.group}>
      <Heading className={styles.title}>{g.competition}</Heading>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.round}>
              라운드
            </th>
            <th scope="col" className={styles.when}>
              <span className={styles.pcOnly}>경기일정</span>
              <span className={styles.mOnly}>일시</span>
            </th>
            <th scope="col" className={styles.versusHead}>
              경기 대진표
            </th>
            <th scope="col" className={styles.venue}>
              경기장소
            </th>
            <th scope="col" className={styles.result}>
              결과
            </th>
          </tr>
        </thead>
        <tbody>
          {g.matches.map((m) => (
            <MatchTableRow key={m.id} match={m} ourName={ourName} details={details} next={m.id === nextId} />
          ))}
        </tbody>
      </table>
    </section>
  ));
}

function MatchTableRow({ match, ourName, details, next }: { match: Match; ourName: string; details: boolean; next: boolean }) {
  const { date, time } = formatKickoffFull(match.kickoff);
  const { home, away, score } = matchSides(match, ourName);
  const result = matchResult(match);
  // 'YYYY-MM-DD (요일)' — 휴대폰은 연도를 숨겨 'MM-DD (요일)'
  const [year, rest] = [date.slice(0, 5), date.slice(5)];

  return (
    <tr className={next ? styles.next : undefined}>
      <td className={styles.round}>{match.round || "-"}</td>
      <td className={styles.when}>
        {next && <span className="sr-only">다음 경기, </span>}
        {match.round && <span className={styles.mRound}>{match.round}</span>}
        <span className={styles.date}>
          <span className={styles.year}>{year}</span>
          {rest}
        </span>
        <span className={styles.time}>{time}</span>
      </td>
      <td className={styles.versusCell}>
        <span className={styles.versus}>
          <span className={styles.homeSide}>
            <TeamName name={home} className={styles.teamName} />
            <TeamCrest team={home} us={match.isHome} size={24} />
          </span>
          <span className={styles.vs} aria-hidden="true">
            vs
          </span>
          <span className="sr-only"> 대 </span>
          <span className={styles.awaySide}>
            <TeamCrest team={away} us={!match.isHome} size={24} />
            <TeamName name={away} className={styles.teamName} />
          </span>
        </span>
        {/* 휴대폰: 장소 칸이 숨으므로 대진 아래 장소 줄 + HOME */}
        {(match.venue || match.isHome) && (
          <span className={styles.mVenue}>
            {match.venue}
            <HomeAwayBadge isHome={match.isHome} surface="tint" />
          </span>
        )}
        {details && hasMatchDetails(match) && <MatchDetails match={match} ourName={ourName} />}
      </td>
      <td className={styles.venue}>
        <span className={styles.venueInner}>
          <HomeAwayBadge isHome={match.isHome} surface="tint" />
          <span className={styles.venueName}>{match.venue || "-"}</span>
        </span>
      </td>
      <td className={styles.result}>
        {score ? (
          // 승/무/패를 색 상자로 구분 (D-013) — 색만으로 전하지 않게 글자도 숨겨 둔다
          <span className={`${styles.scoreBox} ${result ? styles[result] : ""}`}>
            {result && <span className="sr-only">{RESULT_LABEL[result]} </span>}
            {score[0]} : {score[1]}
          </span>
        ) : (
          <span className={styles.noScore}>-</span>
        )}
      </td>
    </tr>
  );
}

/** 경기결과: 우리 팀 득점 줄 + 하이라이트/다시보기 버튼 (있을 때만, 새 창) */
function MatchDetails({ match, ourName }: { match: Match; ourName: string }) {
  const videos = matchVideoLinks(match, ourName);
  return (
    <span className={styles.details}>
      {match.scorers && (
        <span className={styles.scorers}>
          {/* 득점자는 우리 팀만 적는다 — 화면 읽기에는 팀 이름을 붙인다 */}
          <span className={styles.scorersLabel}>
            <span className="sr-only">{ourName} </span>득점
          </span>
          <span>{match.scorers}</span>
        </span>
      )}
      {videos.length > 0 && (
        <span className={styles.videos}>
          {videos.map((v) => (
            <a key={v.kind} href={v.url} target="_blank" rel="noopener noreferrer" aria-label={v.ariaLabel} className={styles.video}>
              {v.label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </span>
      )}
    </span>
  );
}
