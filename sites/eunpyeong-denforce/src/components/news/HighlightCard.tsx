import type React from "react";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
import { highlightLabel, type HighlightItem } from "@/lib/highlights";
import styles from "./HighlightCard.module.css";
import { PlayMark } from "./PlayMark";

/**
 * 은평 경기 하이라이트 카드 (D-091) — 썸네일 16:9 + PlayMark 36, 분류 '하이라이트 ↗', 제목 대진(스코어만 파랑, 홈팀 왼쪽), 날짜 + 대회.
 * 카드 전체가 유튜브 새 창 링크.
 */
export function HighlightCard({ item }: { item: HighlightItem }) {
  const score = item.homeScore !== null && item.awayScore !== null;
  return (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={styles.card} aria-label={highlightLabel(item)}>
      <span className={styles.thumb}>
        {item.thumbnail ? (
          // 유튜브 썸네일 원본 그대로(이미지 최적화 안 씀, D-073). 꾸밈 — 이름은 링크가 갖는다
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnail} alt="" loading="lazy" decoding="async" className={styles.image} referrerPolicy="no-referrer" />
        ) : (
          <EmblemFallback />
        )}
        <PlayMark />
      </span>
      <span className={styles.text}>
        <span className={styles.category}>
          하이라이트 <span aria-hidden="true">↗</span>
        </span>
        <strong className={styles.title}>
          {item.home}
          {score ? (
            <span className={styles.score}>
              {" "}
              {item.homeScore} : {item.awayScore}{" "}
            </span>
          ) : (
            " vs "
          )}
          {item.away}
        </strong>
        <span className={styles.meta}>
          {item.date} {item.competition}
        </span>
      </span>
    </a>
  );
}

/** 하이라이트 줄 — PC 4칸 격자(넘치면 다음 줄), 휴대폰 280 가로 넘김 */
export function HighlightRow({ items }: { items: HighlightItem[] }) {
  return (
    <ul className={styles.row}>
      {items.map((h) => (
        <li key={h.id}>
          <HighlightCard item={h} />
        </li>
      ))}
    </ul>
  );
}

/** 줄 묶음(제목 섹션 포함)을 감싸 아래 여백을 준다 — 다음이 스폰서 띠나 격자라 위 여백이 없는 자리 */
export function HighlightBlock({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className={styles.block}>
      {children}
    </div>
  );
}
