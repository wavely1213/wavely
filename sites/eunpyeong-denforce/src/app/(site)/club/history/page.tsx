import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { getHistory } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

export const metadata: Metadata = { title: "연혁" };

export default async function HistoryPage() {
  const history = await getHistory();
  return (
    <>
      <PageHeader title="연혁" current="/club/history" />
      <div className="container">
        <ul className={styles.list}>
          {history.map((h) => (
            <li key={h.id}>
              <span>{h.year}</span>
              <span>{h.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
