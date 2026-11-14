import { CAPTAIN_LABEL, type Captain } from "@/lib/captain";
import styles from "./CaptainBadge.module.css";

/** 선수 카드 이름 옆 'C' / 'VC' 배지 (D-093). 읽기 프로그램에는 '주장' / '부주장' */
export function CaptainBadge({ captain }: { captain: Captain | null | undefined }) {
  if (!captain) return null;
  return (
    <span className={styles.badge}>
      <span aria-hidden="true">{captain}</span>
      <span className="sr-only">{CAPTAIN_LABEL[captain]}</span>
    </span>
  );
}
