import Image from "next/image";
import type { CSSProperties } from "react";
import { marqueeLoop } from "@/lib/sponsors";
import type { Sponsor } from "@/types";
import styles from "./SponsorMarquee.module.css";

/** 메인 히어로 바로 아래 스폰서 로고 띠 — 한 줄로 계속 옆으로 흐른다. 마우스를 올리면 멈춤 (D-029) */
export function SponsorMarquee({ sponsors }: { sponsors: Sponsor[] }) {
  const { cells, seconds } = marqueeLoop(sponsors);
  return (
    <section className={styles.band} aria-label="스폰서">
      <div className={styles.viewport}>
        <ul className={styles.track} style={{ "--marquee-duration": `${seconds}s` } as CSSProperties}>
          {cells.map(({ item: s, key, clone }) => {
            const content = s.logo ? (
              // 띠가 화면 밖에서 흘러 들어오므로 지연 로딩이면 들어오는 순간 비어 보인다 — 바로 받는다 (로고 5개 합 ~120KB)
              <Image src={s.logo} alt={clone ? "" : s.name} width={240} height={60} loading="eager" className={styles.logo} />
            ) : (
              <span className={styles.name}>{s.name}</span>
            );
            return (
              <li key={key} className={styles.item} aria-hidden={clone || undefined}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" tabIndex={clone ? -1 : undefined}>
                    {content}
                  </a>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
