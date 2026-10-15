import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/config/site";
import { formatKickoff } from "@/lib/format";
import type { Match } from "@/types";
import styles from "./Hero.module.css";

/** 메인 최상단: 대표 사진 + 다음 홈경기 */
export function Hero({ nextHome }: { nextHome?: Match }) {
  return (
    <section className={styles.hero}>
      <Image
        src="/photos/hero-dreamleague-2019.webp"
        alt="서울은평 선수단 단체 사진"
        fill
        preload
        sizes="100vw"
        className={styles.bg}
      />
      <div className={styles.overlay} />
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>SINCE {SITE.founded} · FK LEAGUE</p>
          <h1 className={styles.title}>
            은평의 자부심,
            <br />
            {SITE.name}
          </h1>
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
        {match.venue && ` · ${match.venue}`}
      </span>
    </Link>
  );
}
