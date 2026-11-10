import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlayerFilter } from "@/components/player/PlayerFilter";
import { Placeholder } from "@/components/ui/Placeholder";
import { LEAGUE } from "@/config/league";
import { POSITION_LABEL } from "@/data/people";
import { pageMetadata } from "@/lib/page-meta";
import { getPlayersByPosition, isLiveData } from "@/lib/repo";
import { seasonYear } from "@/lib/standings";
import styles from "./players.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("선수", "/team/players");
}

/** 선수 목록 (리디자인 2차 시안, 동명이인 구분안 2: 카드 아래 출전 줄 + 목록 아래 출처) */
export default async function PlayersPage() {
  const groups = (await getPlayersByPosition()).map(([position, players]) => ({ position, label: POSITION_LABEL[position], players }));
  const live = isLiveData();
  // 대회명 어디에 있든 시즌 'YYYY-YY' (D-072 '키움증권 2026-27 FK리그1' 형식도) — 모르면 출전 줄과 출처 줄을 숨긴다
  const statsYear = seasonYear(LEAGUE.statsSeason);
  const appsSeason = live ? statsYear : null;
  const anyApps = groups.some((g) => g.players.some((p) => p.stats.apps > 0));
  return (
    <>
      <PageHeader title="선수" current="/team/players" />
      <div className={`container ${styles.body}`}>
        {/* 선수가 없으면 안내 (디자인 UX 상태 표 208:21545) */}
        {groups.every((g) => g.players.length === 0) ? (
          <Placeholder label="등록된 선수가 없습니다." />
        ) : (
          <PlayerFilter groups={groups} appsSeason={anyApps ? appsSeason : null} />
        )}
        {appsSeason && anyApps && (
          <p className={styles.note}>
            출전: {appsSeason} 기록 / 자료: {LEAGUE.source}
          </p>
        )}
      </div>
    </>
  );
}
