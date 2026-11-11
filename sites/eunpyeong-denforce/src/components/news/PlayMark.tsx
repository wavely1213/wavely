import styles from "./PlayMark.module.css";

/** 영상 표지 위 재생 표시 (꾸밈, aria-hidden) — 카드, 홈 소식 탭, 배너가 같이 쓴다 (D-074). 부모는 position: relative */
export function PlayMark({ size = "m" }: { size?: "s" | "m" }) {
  return (
    <span className={`${styles.play} ${size === "s" ? styles.small : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
    </span>
  );
}
