import Image from "next/image";
import { SPONSOR_TIER_LABEL } from "@/data/sponsors";
import { wideColumns } from "@/lib/sponsors";
import type { Sponsor } from "@/types";
import styles from "./SponsorStrip.module.css";

/**
 * /sponsors 스폰서 카드 격자 — 소유자가 정한 순서 그대로 (D-029).
 * 네이밍 스폰서는 두 칸 폭(줄 끝에 빈칸이 생기는 칸 수에서는 한 칸)에 로고를 크게, 로고 아래 작은 글씨로 이름.
 */
export function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  const wide = wideColumns(sponsors.map((s) => s.tier));
  return (
    <ul className={styles.list}>
      {sponsors.map((s, i) => {
        const isNaming = s.tier === "naming";
        const content = s.logo ? (
          <>
            <Image
              src={s.logo}
              alt={s.name}
              width={isNaming ? 320 : 240}
              height={isNaming ? 88 : 64}
              className={styles.logo}
            />
            {/* 이름은 로고 대체 글(alt)과 같아 스크린리더에는 한 번만 */}
            <span className={styles.caption} aria-hidden="true">
              {s.name}
            </span>
          </>
        ) : (
          <span className={styles.name}>{s.name}</span>
        );
        return (
          <li
            key={s.id}
            className={`${styles.item} ${isNaming ? styles.naming : ""}`}
            data-wide={wide[i].join(" ") || undefined}
          >
            <span className={styles.tier}>{SPONSOR_TIER_LABEL[s.tier]}</span>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer" className={styles.body}>
                {content}
                <span className="sr-only"> (새 창)</span>
              </a>
            ) : (
              <span className={styles.body}>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
