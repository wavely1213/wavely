import type { ReactNode } from "react";
import styles from "./Placeholder.module.css";

/**
 * 아직 콘텐츠가 없는 자리. 운영 시작 시 실제 내용으로 교체한다.
 * children: 문구 아래에 둘 바로가기 등 (예: 경기일정이 비었을 때 리그순위/지난 경기 결과)
 */
export function Placeholder({ label, ratio, children }: { label: string; ratio?: string; children?: ReactNode }) {
  return (
    <div className={`${styles.box} ${children ? styles.stack : ""}`} style={ratio ? { aspectRatio: ratio } : undefined}>
      <span>{label}</span>
      {children}
    </div>
  );
}
