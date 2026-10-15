import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchTable } from "@/components/match/MatchTable";
import { Placeholder } from "@/components/ui/Placeholder";
import { LEAGUE } from "@/config/league";
import { getUpcomingMatches } from "@/lib/repo";

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
          <Placeholder label={`${LEAGUE.nextSeason} 시즌 일정은 ${LEAGUE.source} 발표 후 업데이트됩니다.`} />
        )}
      </div>
    </>
  );
}
