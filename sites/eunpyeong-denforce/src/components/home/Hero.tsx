import Image from "next/image";
import Link from "next/link";
import type { HeroContent } from "@/lib/content/views";
import { formatKickoff } from "@/lib/format";
import type { Match } from "@/types";
import styles from "./Hero.module.css";
import { HeroTitle } from "./HeroTitle";

/** 메인 최상단: 대표 사진 + 다음 홈경기. 사진·문구는 관리자 › 홈페이지 내용 › 메인 (D-046) */
export function Hero({ nextHome, content }: { nextHome?: Match; content: HeroContent }) {
  return (
    <section className={styles.hero}>
      <Image
        src={content.image}
        alt={content.imageAlt}
        fill
        preload
        sizes="100vw"
        className={styles.bg}
      />
      <div className={styles.overlay} />
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <HeroTitle slogan={content.slogan} name={content.name} className={styles.title} leadClassName={styles.lead} />
        </div>
        {nextHome && <NextHome match={nextHome} />}
      </div>
    </section>
  );
}

function NextHome({ match }: { match: Match }) {
  const { date, time } = formatKickoff(match.kickoff);
  return (
    <Link href="/match/schedule" className={styles.next}>
      <span className={styles.nextLabel}>NEXT HOME MATCH</span>
      <strong className={styles.nextTeams}>vs {match.opponent}</strong>
      <span className={styles.nextMeta}>
        {date} {time}
        {match.venue && ` / ${match.venue}`}
      </span>
    </Link>
  );
}
