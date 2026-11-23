import styles from "./admin.module.css";

/** 목록의 공개 상태 — 공개 / 검토 대기(미디어 계정이 올린 비공개 글, D-057) / 비공개 */
export function PublishBadge({ published, pending }: { published: boolean; pending: boolean }) {
  if (published) return <span className={`${styles.badge} ${styles.badgeBlue}`}>공개</span>;
  if (pending) return <span className={`${styles.badge} ${styles.badgeYellow}`}>검토 대기</span>;
  return <span className={styles.badge}>비공개</span>;
}
