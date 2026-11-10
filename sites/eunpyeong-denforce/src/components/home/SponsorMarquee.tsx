"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { marqueeLoop } from "@/lib/sponsors";
import type { Sponsor } from "@/types";
import styles from "./SponsorMarquee.module.css";

/**
 * 메인 스폰서 로고 띠 — 한 줄로 계속 옆으로 흐른다 (D-029). 경기 띠 아래 (리디자인 D-067).
 * 마우스/초점/움직임 줄이기에서 멈추고, 오른쪽 44 버튼으로 멈추고 다시 흐르게 한다 (I-033 해결).
 */
export function SponsorMarquee({ sponsors }: { sponsors: Sponsor[] }) {
  const { cells, seconds } = marqueeLoop(sponsors);
  const [paused, setPaused] = useState(false);
  return (
    <section className={`${styles.band} ${paused ? styles.paused : ""}`} aria-label="스폰서">
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
      <button type="button" className={styles.pause} aria-pressed={paused} onClick={() => setPaused((v) => !v)}>
        <span className="sr-only">{paused ? "스폰서 띠 다시 흐르게" : "스폰서 띠 멈추기"}</span>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          {paused ? <path d="M8 5l11 7-11 7z" fill="currentColor" /> : <path d="M9 5v14M15 5v14" stroke="currentColor" strokeWidth="2" />}
        </svg>
      </button>
    </section>
  );
}
