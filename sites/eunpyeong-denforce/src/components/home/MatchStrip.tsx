import { MatchCard } from "@/components/match/MatchCard";
import { SwipeRow } from "@/components/ui/SwipeRow";
import type { Match } from "@/types";
import styles from "./MatchStrip.module.css";

/**
 * 히어로 아래 경기 띠 (리디자인 D-067, D-034 변경): [지난 경기 | 다음 경기 | 그다음 경기], 빈 칸은 숨기고 남은 칸이 폭을 나눈다.
 * 휴식기(예정 없음)는 최근 결과 3칸. 휴대폰은 스와이프 + 점. 칸 고르기는 lib/match.ts homeMatchItems.
 */
export function MatchStrip({ items, ourName }: { items: Array<{ match: Match; label: string }>; ourName: string }) {
  return (
    <SwipeRow label="경기" fixedOnDesktop tone="dark" className={styles.strip}>
      {items.map(({ match, label }, i) => (
        <MatchCard key={match.id} match={match} label={label} ourName={ourName} divided={i > 0} />
      ))}
    </SwipeRow>
  );
}
