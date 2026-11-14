import Image from "next/image";
import { SITE } from "@/config/site";
import { crestImageFor } from "@/lib/crests";
import { getTeamCrests } from "@/lib/repo";
import { crestInitial, crestInitialShort } from "@/lib/match";
import styles from "./MatchParts.module.css";

export type CrestSize = 112 | 96 | 88 | 72 | 64 | 56 | 40 | 32 | 24;
type MobileCrestSize = 72 | 64 | 40 | 32;

const MOBILE_CLASS: Record<MobileCrestSize, string> = { 72: styles.m72, 64: styles.m64, 40: styles.m40, 32: styles.m32 };

const SIZE_CLASS: Record<CrestSize, string> = {
  112: styles.crest112,
  96: styles.crest96,
  88: styles.crest88,
  72: styles.crest72,
  64: styles.crest64,
  56: styles.crest56,
  40: styles.crest40,
  32: styles.crest32,
  24: styles.crest24,
};

/** 대체 방패 (피그마 MatchEmblem 190:734 '대체') — 81:96, 선 굵기는 크기 단계(CSS --crest-stroke).
 * 피그마는 안쪽 선(마스크) — 여기선 마스크 id 가 겹치지 않게 svg 를 선 굵기 절반만큼 안으로 넣고 가운데 선으로 같은 모양을 낸다 */
function Shield() {
  return (
    <svg className={styles.shield} viewBox="0 0 81 96" preserveAspectRatio="none" fill="none" overflow="visible" aria-hidden="true" focusable="false">
      <path
        d="M0 0H81V55.68C81 78.72 58.32 89.28 40.5 96C22.68 89.28 0 78.72 0 55.68V0Z"
        stroke="currentColor"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * 팀 엠블럼 (피그마 MatchEmblem 190:734, 원 받침 없음). size 는 높이(px), 가로는 원본 비율.
 * - 우리 팀: emblem-mark.png(SINCE 줄 없음, 600x766) 테두리와 바탕 없이 (NMH v2, 모든 크기 공통)
 * - 상대: 받은 투명 원본 — 관리자가 올린 DB 줄(team_crests) 이 코드 목록(src/config/team-crests.ts)을 덮는다 (D-094)
 * - 원본이 없는 상대: 대체 방패(선 윤곽 + 이름 앞 2글자, 놓인 면의 글자색)
 * 팀 이름은 옆 글자로 따로 보이므로 그림은 읽지 않게 숨긴다.
 */
export async function TeamCrest({
  team,
  us,
  size,
  mobileSize,
  surface = size === 24 ? "light" : "dark",
}: {
  team: string;
  us: boolean;
  size: CrestSize;
  mobileSize?: MobileCrestSize;
  /** 놓인 면 — 흰 글씨 로고(인천ZD)는 흰 면에서 검정 파일. 기본: 24(경기표, 순위표)는 흰 면, 나머지(카드, 띠)는 어두운 면 */
  surface?: "dark" | "light";
}) {
  const sizeClass = `${SIZE_CLASS[size]} ${mobileSize ? MOBILE_CLASS[mobileSize] : ""}`;
  if (us) {
    return (
      <span className={`${styles.crest} ${sizeClass}`} aria-hidden="true">
        <Image src={SITE.emblemMark} alt="" width={600} height={766} className={styles.crestImg} />
      </span>
    );
  }
  const img = crestImageFor(team, surface, await getTeamCrests());
  if (img) {
    return (
      <span className={`${styles.crest} ${sizeClass}`} aria-hidden="true">
        <Image src={img.src} alt="" width={img.width} height={img.height} className={styles.crestImg} />
      </span>
    );
  }
  return (
    <span className={`${styles.crest} ${styles.crestFallback} ${sizeClass}`} aria-hidden="true">
      <Shield />
      <span className={styles.crestText}>{size === 24 ? crestInitialShort(team) : crestInitial(team)}</span>
    </span>
  );
}
