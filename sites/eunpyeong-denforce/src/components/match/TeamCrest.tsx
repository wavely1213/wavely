import Image from "next/image";
import { SITE } from "@/config/site";
import { crestInitial } from "@/lib/match";
import styles from "./MatchParts.module.css";

/**
 * 팀 엠블럼 원 (리디자인 D-067). 우리 팀은 구단 엠블럼(bg 원 받침), 상대는 엠블럼 자료가 없어 이름 앞 2글자(bg-soft 원).
 * 팀 이름은 옆/아래 글자로 따로 보이므로 그림은 읽지 않게 숨긴다.
 */
export function TeamCrest({ team, us, size }: { team: string; us: boolean; size: 56 | 40 | 24 }) {
  const sizeClass = size === 56 ? styles.crest56 : size === 40 ? styles.crest40 : styles.crest24;
  if (us) {
    return (
      <span className={`${styles.crest} ${styles.crestUs} ${sizeClass}`} aria-hidden="true">
        <Image src={SITE.emblemMark} alt="" width={134} height={171} />
      </span>
    );
  }
  return (
    <span className={`${styles.crest} ${sizeClass}`} aria-hidden="true">
      {crestInitial(team)}
    </span>
  );
}
