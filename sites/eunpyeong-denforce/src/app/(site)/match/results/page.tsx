import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchTable } from "@/components/match/MatchTable";
import { Placeholder } from "@/components/ui/Placeholder";
import { LEAGUE } from "@/config/league";
import { pageMetadata } from "@/lib/page-meta";
import { getFinishedMatches, getSiteContent, isLiveData } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("경기결과", "/match/results");
}

export default async function ResultsPage() {
  const [matches, content] = await Promise.all([getFinishedMatches(), getSiteContent()]);
  return (
    <>
      <PageHeader title="경기결과" current="/match/results" />
      <div className="container">
        {matches.length > 0 ? (
          <>
            <MatchTable matches={matches} details />
            {isLiveData() && <p className={`${styles.note} ${styles.source}`}>자료: {LEAGUE.source}</p>}
          </>
        ) : (
          <Placeholder label={content["results.empty"]} />
        )}
      </div>
    </>
  );
}
