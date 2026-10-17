import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { MatchTable } from "@/components/match/MatchTable";
import { StandingsTable } from "@/components/match/StandingsTable";
import { LEAGUE } from "@/config/league";
import { nonEmptyParams } from "@/lib/params";
import { getPastLeague, getPastLeagues, getSeasonResults, isLiveData } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

// 지난 리그 한 시즌: 최종 순위 + 그 시즌 우리 경기 결과 (BR-016)

export async function generateStaticParams() {
  return nonEmptyParams(
    (await getPastLeagues()).map((l) => ({ season: l.slug })),
    { season: "none" },
  );
}

async function load(params: PageProps<"/match/standings/[season]">["params"]) {
  const { season } = await params;
  return getPastLeague(season);
}

export async function generateMetadata({ params }: PageProps<"/match/standings/[season]">): Promise<Metadata> {
  const league = await load(params);
  return { title: league ? `${league.season} 최종 순위` : "리그순위" };
}

export default async function PastLeaguePage({ params }: PageProps<"/match/standings/[season]">) {
  const league = await load(params);
  if (!league) notFound();
  const results = await getSeasonResults(league.season);

  return (
    <>
      <PageHeader title="리그순위" current="/match/standings" />
      <div className={`container ${styles.body}`}>
        <section>
          <h2 className={styles.h2}>{league.season} 최종 순위</h2>
          <StandingsTable rows={league.rows} />
          <p className={`${styles.note} ${styles.source}`}>
            순위 기준: 승점 → 득실차 → 다득점{isLiveData() && ` / 자료: ${LEAGUE.source}`}
          </p>
        </section>

        {results.length > 0 && (
          <section>
            <h2 className={styles.h2}>경기 결과</h2>
            <MatchTable matches={results} />
          </section>
        )}

        <p>
          <Link href="/match/standings" className={styles.button}>
            목록
          </Link>
        </p>
      </div>
    </>
  );
}
