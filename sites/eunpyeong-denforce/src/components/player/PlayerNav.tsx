import Link from "next/link";
import { POSITION_LABEL } from "@/data/people";
import type { Player } from "@/types";
import styles from "./PlayerNav.module.css";

/** 선수 상세 맨 아래 '이전 선수 / 선수 목록 / 다음 선수' (리디자인 2차 시안) — 목록 순서, 처음/끝은 빈 칸 */
export function PlayerNav({ prev, next }: { prev: Player | null; next: Player | null }) {
  return (
    <nav className={styles.nav} aria-label="다른 선수">
      <div className={styles.side}>
        {prev && (
          <Link href={`/team/players/${prev.slug}`} className={styles.link} rel="prev">
            <span className={styles.dir}>
              <span aria-hidden="true">←</span> 이전 선수
            </span>
            <span className={styles.who}>
              <strong>{prev.name}</strong> <span className={styles.pos}>{POSITION_LABEL[prev.position]}</span>
            </span>
          </Link>
        )}
      </div>
      <Link href="/team/players" className={styles.list}>
        <span aria-hidden="true">←</span> 선수 목록
      </Link>
      <div className={`${styles.side} ${styles.end}`}>
        {next && (
          <Link href={`/team/players/${next.slug}`} className={`${styles.link} ${styles.linkEnd}`} rel="next">
            <span className={styles.dir}>
              다음 선수 <span aria-hidden="true">→</span>
            </span>
            <span className={styles.who}>
              <strong>{next.name}</strong> <span className={styles.pos}>{POSITION_LABEL[next.position]}</span>
            </span>
          </Link>
        )}
      </div>
    </nav>
  );
}
