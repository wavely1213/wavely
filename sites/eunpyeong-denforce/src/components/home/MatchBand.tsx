import type { ReactNode } from "react";
import styles from "./MatchBand.module.css";

/**
 * 홈 히어로 바로 아래 경기 띠 (D-085) — 제목 줄('경기' + '전체 일정')을 없앴다. 각 칸이 결과/일정으로 이어진다.
 * 제목은 화면에 보이지 않지만 읽기 프로그램용 숨김 제목(h2)으로 남긴다.
 */
export function MatchBand({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.band} data-surface="dark" aria-labelledby="home-matches-title">
      <div className="container">
        <h2 id="home-matches-title" className="sr-only">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
