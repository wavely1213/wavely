import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchTable } from "@/components/match/MatchTable";
import { Placeholder } from "@/components/ui/Placeholder";
import { SnsIcon } from "@/components/ui/SnsIcon";
import { LEAGUE } from "@/config/league";
import { scheduleEmptyLinks } from "@/lib/match";
import { getClubSettings, getUpcomingMatches } from "@/lib/repo";
import styles from "./schedule.module.css";

export const metadata: Metadata = { title: "경기일정" };

export default async function SchedulePage() {
  const matches = await getUpcomingMatches();
  return (
    <>
      <PageHeader title="경기일정" current="/match/schedule" />
      <div className="container">
        {matches.length > 0 ? (
          <MatchTable matches={matches} />
        ) : (
          <Placeholder label={`${LEAGUE.nextSeason} 시즌 일정은 ${LEAGUE.source} 발표 후 업데이트됩니다.`}>
            <EmptyLinks />
          </Placeholder>
        )}
      </div>
    </>
  );
}

/** 일정이 없을 때 바로가기 — 리그순위 / 지난 경기 결과 / 구단 인스타그램(새 창) */
async function EmptyLinks() {
  const { instagramUrl } = await getClubSettings();
  return (
    <ul className={styles.links} aria-label="바로가기">
      {scheduleEmptyLinks(instagramUrl).map((l) => (
        <li key={l.href}>
          {l.external ? (
            <a href={l.href} target="_blank" rel="noopener noreferrer" className={styles.link}>
              <SnsIcon name="Instagram" />
              {l.label}
              <span className="sr-only"> (구단 인스타그램, 새 창)</span>
            </a>
          ) : (
            <Link href={l.href} className={styles.link}>
              {l.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
