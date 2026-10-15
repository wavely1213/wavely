import styles from "./Placeholder.module.css";

/** 아직 콘텐츠가 없는 자리. 운영 시작 시 실제 내용으로 교체한다. */
export function Placeholder({ label, ratio }: { label: string; ratio?: string }) {
  return (
    <div className={styles.box} style={ratio ? { aspectRatio: ratio } : undefined}>
      <span>{label}</span>
    </div>
  );
}
