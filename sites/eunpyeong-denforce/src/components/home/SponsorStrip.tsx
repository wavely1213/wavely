import Image from "next/image";
import type { Sponsor, SponsorTier } from "@/types";
import styles from "./SponsorStrip.module.css";

/** 등급별 로고 요청 크기 — 높이는 SponsorStrip.module.css 의 등급별 로고 높이와 같게, 너비는 가로로 긴 로고 기준 */
const LOGO_SIZE: Record<SponsorTier, { width: number; height: number }> = {
  naming: { width: 360, height: 96 },
  official: { width: 288, height: 76 },
  sub: { width: 240, height: 64 },
  partner: { width: 196, height: 52 },
};

/**
 * /sponsors 한 등급의 스폰서 카드 격자 — 받은 순서(관리자 표시 순서) 그대로.
 * 높은 등급일수록 로고가 크다. 네이밍 스폰서는 한 곳이면 한 줄 전체. 로고 아래 작은 글씨로 이름.
 */
export function SponsorStrip({ tier, sponsors }: { tier: SponsorTier; sponsors: Sponsor[] }) {
  const size = LOGO_SIZE[tier];
  return (
    <ul className={styles.list} data-tier={tier}>
      {sponsors.map((s) => {
        const content = s.logo ? (
          <>
            <Image src={s.logo} alt={s.name} width={size.width} height={size.height} className={styles.logo} />
            {/* 이름은 로고 대체 글(alt)과 같아 스크린리더에는 한 번만 */}
            <span className={styles.caption} aria-hidden="true">
              {s.name}
            </span>
          </>
        ) : (
          <span className={styles.name}>{s.name}</span>
        );
        return (
          <li key={s.id} className={styles.item}>
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
