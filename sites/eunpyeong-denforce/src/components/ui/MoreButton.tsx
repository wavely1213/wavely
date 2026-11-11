import styles from "./MoreButton.module.css";

/** 목록 아래 '더 보기' — 옆에 작게 'N개 남음' (리디자인 3차 MoreButton 146:744, 포스팅/구단소식 목록 공용) */
export function MoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  return (
    <div className={styles.more}>
      <button type="button" className={styles.button} onClick={onClick}>
        더 보기 <span className={styles.count}>{remaining}개 남음</span>
      </button>
    </div>
  );
}
