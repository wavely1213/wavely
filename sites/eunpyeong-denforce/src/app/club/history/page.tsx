import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { HISTORY } from "@/data/club";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "연혁" };

export default function HistoryPage() {
  return (
    <>
      <PageHeader title="연혁" current="/club/history" />
      <div className="container">
        <ul className={styles.list}>
          {HISTORY.map((h) => (
            <li key={h.year + h.text}>
              <span>{h.year}</span>
              <span>{h.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
