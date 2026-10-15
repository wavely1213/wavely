import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchRow } from "@/components/match/MatchRow";
import { Placeholder } from "@/components/ui/Placeholder";
import { getFinishedMatches } from "@/lib/repo";

export const metadata: Metadata = { title: "경기결과" };

export default async function ResultsPage() {
  const matches = await getFinishedMatches();
  return (
    <>
      <PageHeader title="경기결과" current="/match/results" />
      <div className="container">
        {matches.length > 0 ? (
          <ul>
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </ul>
        ) : (
          <Placeholder label="종료된 경기가 없습니다." />
        )}
      </div>
    </>
  );
}
