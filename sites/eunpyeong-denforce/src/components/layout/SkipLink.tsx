import styles from "./SkipLink.module.css";

/** '본문 바로가기' — 머리 맨 앞, 키보드 초점이 올 때만 보인다. 공개 레이아웃 <main id="main" tabIndex={-1}> 로 간다 */
export function SkipLink() {
  return (
    <a href="#main" className={styles.skip}>
      본문 바로가기
    </a>
  );
}
