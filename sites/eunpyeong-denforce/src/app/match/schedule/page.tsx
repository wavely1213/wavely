import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchRow } from "@/components/match/MatchRow";
import { Placeholder } from "@/components/ui/Placeholder";
import { getUpcomingMatches } from "@/lib/repo";

export const metadata: Metadata = { title: "경기일정" };

export default async function SchedulePage() {
  const matches = await getUpcomingMatches();
  return (
    <>
      <PageHeader title="경기일정" current="/match/schedule" />
      <div className="container">
        {matches.length > 0 ? (
          <ul>
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </ul>
        ) : (
          <Placeholder label="예정된 경기가 없습니다." />
        )}
      </div>
    </>
  );
}
