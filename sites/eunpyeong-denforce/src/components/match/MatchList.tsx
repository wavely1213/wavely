import { groupByCompetition } from "@/lib/match";
import type { Match } from "@/types";
import { MatchRow } from "./MatchRow";
import styles from "./MatchList.module.css";

/** 경기 목록 (일정·결과 페이지) — 대회별로 묶어 보여준다 */
export function MatchList({ matches }: { matches: Match[] }) {
  return groupByCompetition(matches).map((g, i) => (
    <section key={`${i}-${g.competition}`} className={styles.group}>
      <h2 className={styles.title}>{g.competition}</h2>
      <ul>
        {g.matches.map((m) => (
          <MatchRow key={m.id} match={m} />
        ))}
      </ul>
    </section>
  ));
}
