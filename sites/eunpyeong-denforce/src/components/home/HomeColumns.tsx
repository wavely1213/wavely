import type { ReactNode } from "react";
import styles from "./HomeColumns.module.css";

/**
 * 메인 두 칸 배치 (D-034) — 왼쪽 본문(경기·구단 소식) + 오른쪽 위젯 칸.
 * PC 에서는 위젯이 스크롤해도 화면에 남고(sticky), 좁은 화면(≤1080px)에서는 본문 아래로 내려간다.
 * 위젯이 없으면 본문만 한 칸.
 */
export function HomeColumns({ main, aside }: { main: ReactNode; aside: ReactNode | null }) {
  if (!aside) return <div className="container">{main}</div>;
  return (
    <div className={`container ${styles.columns}`}>
      <div className={styles.main}>{main}</div>
      <aside className={styles.aside} aria-label="위젯">
        <div className={styles.stick}>{aside}</div>
      </aside>
    </div>
  );
}
