"use client";

import { useState } from "react";
import { formatPostDate } from "@/lib/format";
import styles from "./drive.module.css";

export type RecentImport = {
  file_id: string;
  kind: "image" | "video_cover";
  purpose: string;
  file_name: string;
  url: string;
  view_url: string | null;
  imported_at: string;
};

const PURPOSE_LABEL: Record<string, string> = {
  library: "자료함",
  news: "구단소식",
  players: "선수",
  video: "구단영상",
  crest: "엠블럼",
};

export function CopyButton({ text, label = "주소 복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={styles.copy}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        } catch {
          window.prompt("주소를 복사하세요", text);
        }
      }}
    >
      {done ? "복사함" : label}
    </button>
  );
}

/** 최근 가져온 파일 (drive_imports) — 어디서 골랐는지, 언제, 주소 복사 */
export function RecentImports({ items }: { items: RecentImport[] }) {
  if (items.length === 0) return <p className={styles.status}>아직 가져온 파일이 없습니다.</p>;
  return (
    <ul className={styles.recent}>
      {items.map((it) => (
        <li key={it.file_id} className={styles.recentItem}>
          {it.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.url} alt="" loading="lazy" />
          ) : (
            <span className={styles.thumb} />
          )}
          <span className={styles.recentText}>
            <strong>{it.file_name || it.file_id}</strong>
            <span className={styles.meta}>
              {it.kind === "video_cover" ? "영상" : "사진"} / {PURPOSE_LABEL[it.purpose] ?? it.purpose} / {formatPostDate(it.imported_at.slice(0, 10))}
            </span>
            {it.view_url ? <CopyButton text={it.view_url} label="영상 링크 복사" /> : it.url && <CopyButton text={it.url} />}
          </span>
        </li>
      ))}
    </ul>
  );
}
