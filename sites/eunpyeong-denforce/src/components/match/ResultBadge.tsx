import { RESULT_LABEL } from "@/lib/format";
import styles from "./MatchParts.module.css";

/** 경기 결과 배지 (카드용, D-013 결과색) — 승/무/패 */
export function ResultBadge({ result }: { result: "W" | "D" | "L" }) {
  return <span className={`${styles.result} ${styles[result]}`}>{RESULT_LABEL[result]}</span>;
}
