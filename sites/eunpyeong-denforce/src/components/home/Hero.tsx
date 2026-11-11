import Image from "next/image";
import type { HeroContent } from "@/lib/content/views";
import type { Match } from "@/types";
import styles from "./Hero.module.css";
import { HeroTitle } from "./HeroTitle";
import { NextMatchHero } from "./NextMatchHero";

/**
 * 메인 최상단 (리디자인 D-067): 대표 사진 + 그라데이션(왼쪽 아래 진하게 → 오른쪽 위 옅게), 왼쪽 아래 문구, 오른쪽 아래 다음 홈경기 카드.
 * 사진/문구는 관리자 › 홈페이지 내용 › 메인 (D-046). 두 줄 제목 폭 맞춤은 HeroTitle (D-036).
 */
export function Hero({ nextHome, content, ourName }: { nextHome?: Match; content: HeroContent; ourName: string }) {
  return (
    <section className={styles.hero} data-surface="dark">
      <Image src={content.image} alt={content.imageAlt} fill preload sizes="100vw" className={styles.bg} />
      <div className={styles.overlay} />
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <HeroTitle slogan={content.slogan} name={content.name} className={styles.title} leadClassName={styles.lead} />
        </div>
        {nextHome && <NextMatchHero match={nextHome} ourName={ourName} />}
      </div>
    </section>
  );
}
