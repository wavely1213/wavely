import styles from "./MatchParts.module.css";

export type Surface = "light" | "tint" | "dark" | "blue";

const BADGE: Record<Surface, string> = { light: styles.badgeLight, tint: styles.badgeTint, dark: styles.badgeDark, blue: styles.badgeBlue };
const TAG: Record<Surface, string> = { light: styles.tagLight, tint: styles.tagTint, dark: styles.tagDark, blue: styles.tagBlue };

/** 홈경기 배지 — 홈경기만 'HOME', 원정은 배지 없음 (리디자인 '빼는 것': AWAY 배지) */
export function HomeAwayBadge({ isHome, surface }: { isHome: boolean; surface: Surface }) {
  if (!isHome) return null;
  return <span className={`${styles.badge} ${BADGE[surface]}`}>HOME</span>;
}

/** 대회 + 라운드 글자 ('2026-27 FK1리그 / 4R') */
export function CompetitionTag({ text, surface }: { text: string; surface: Surface }) {
  return <span className={`${styles.tag} ${TAG[surface]}`}>{text}</span>;
}
