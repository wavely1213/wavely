import styles from "./MoreButton.module.css";

/** 목록 아래 '더 보기' — 남은 개수를 옆에 작게 (포스팅/구단소식 목록 공용) */
export function MoreButton({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  return (
    <div className={styles.more}>
      <button type="button" className={styles.button} onClick={onClick}>
        더 보기 <span className={styles.count}>{remaining}</span>
        <span className="sr-only">개 남음</span>
      </button>
    </div>
  );
}
