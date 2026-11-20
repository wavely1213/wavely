import styles from "./PlayMark.module.css";

/** 영상 표지 위 재생 표시 (꾸밈, aria-hidden) — 카드, 홈 소식 탭, 배너가 같이 쓴다 (D-074). 부모는 position: relative */
/** size: m 36(왼쪽 아래 12), s 28(4), ms = PC 36 / 휴대폰 28(왼쪽 아래 8) — 홈 릴스 줄 (D-095) */
/** place: 자리 — 기본 왼쪽 아래, 'end' 는 오른쪽 아래 (구단영상 롱폼 카드가 썸네일 글자와 겹칠 때 바꿀 수 있게, D-101) */
export type PlayPlace = "start" | "end";

export function PlayMark({ size = "m", place = "start" }: { size?: "s" | "m" | "ms"; place?: PlayPlace }) {
  const cls = size === "s" ? styles.small : size === "ms" ? styles.phoneSmall : "";
  return (
    <span className={`${styles.play} ${cls} ${place === "end" ? styles.end : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M8 5v14l11-7z" fill="currentColor" />
      </svg>
    </span>
  );
}
