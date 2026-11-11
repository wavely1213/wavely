import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchTable } from "@/components/match/MatchTable";
import { Placeholder } from "@/components/ui/Placeholder";
import { SnsIcon } from "@/components/ui/SnsIcon";
import { LEAGUE } from "@/config/league";
import { scheduleEmptyLinks } from "@/lib/match";
import { pageMetadata } from "@/lib/page-meta";
import { getClubSettings, getSiteContent, getUpcomingMatches, isLiveData } from "@/lib/repo";
import prose from "@/styles/prose.module.css";
import styles from "./schedule.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("경기일정", "/match/schedule");
}

export default async function SchedulePage() {
  const [matches, content] = await Promise.all([getUpcomingMatches(), getSiteContent()]);
  return (
    <>
      <PageHeader title="경기일정" current="/match/schedule" />
      <div className="container">
        {matches.length > 0 ? (
          <>
            {/* 가장 가까운 예정 경기(원정 포함) 행은 blue-tint — 리디자인 2차 '다음 경기 행' */}
            <MatchTable matches={matches} nextId={matches[0]?.id} />
            {isLiveData() && <p className={`${prose.note} ${prose.source}`}>자료: {LEAGUE.source}</p>}
          </>
        ) : (
          <Placeholder label={content["schedule.empty"]}>
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
