import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/config/site";
import { formatKickoff } from "@/lib/format";
import type { Match } from "@/types";
import styles from "./Hero.module.css";

/** 메인 최상단: 대표 사진 + 다음 홈경기 카드 */
export function Hero({ nextHome }: { nextHome?: Match }) {
  return (
    <section className={styles.hero}>
      <Image
        src="/photos/hero-dreamleague-2019.jpg"
        alt="서울은평 선수단 단체 사진"
        fill
        priority
        sizes="100vw"
        className={styles.bg}
      />
      <div className={styles.overlay} />
      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{SITE.nameEn}</p>
          <h1 className={styles.title}>
            은평의 자부심,
            <br />
            {SITE.name}
          </h1>
          <p className={styles.sub}>since {SITE.founded} · FK리그</p>
        </div>

        <div className={styles.card}>
          <p className={styles.cardLabel}>NEXT HOME MATCH</p>
          {nextHome ? (
            <NextMatch match={nextHome} />
          ) : (
            <p className={styles.empty}>예정된 홈경기가 없습니다.</p>
          )}
          <Link href="/match/schedule" className={styles.cta}>
            전체 경기일정
          </Link>
        </div>
      </div>
    </section>
  );
}

function NextMatch({ match }: { match: Match }) {
  const { date, time } = formatKickoff(match.kickoff);
  return (
    <>
      <p className={styles.round}>
        {match.competition} · {match.round}
      </p>
      <div className={styles.teams}>
        <strong>{SITE.name}</strong>
        <span className={styles.vs}>VS</span>
        <strong>{match.opponent}</strong>
      </div>
      <p className={styles.when}>
        {date} {time}
      </p>
      <p className={styles.venue}>{match.venue}</p>
    </>
  );
}
