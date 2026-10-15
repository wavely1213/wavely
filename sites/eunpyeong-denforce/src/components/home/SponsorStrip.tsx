import Image from "next/image";
import { SPONSOR_TIER_LABEL } from "@/data/sponsors";
import type { Sponsor } from "@/types";
import styles from "./SponsorStrip.module.css";

export function SponsorStrip({ sponsors }: { sponsors: Sponsor[] }) {
  return (
    <ul className={styles.list}>
      {sponsors.map((s) => {
        const content = s.logo ? (
          <Image src={s.logo} alt={s.name} width={160} height={60} className={styles.logo} />
        ) : (
          <span className={styles.name}>{s.name}</span>
        );
        return (
          <li key={s.name} className={styles.item}>
            <span className={styles.tier}>{SPONSOR_TIER_LABEL[s.tier]}</span>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer">
                {content}
              </a>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
