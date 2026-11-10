import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlayerFilter } from "@/components/player/PlayerFilter";
import { Placeholder } from "@/components/ui/Placeholder";
import { LEAGUE } from "@/config/league";
import { POSITION_LABEL } from "@/data/people";
import { pageMetadata } from "@/lib/page-meta";
import { getPlayersByPosition, isLiveData } from "@/lib/repo";
import styles from "./players.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("선수", "/team/players");
}

/** 선수 목록 (리디자인 2차 시안, 동명이인 구분안 2: 카드 아래 출전 줄 + 목록 아래 출처) */
export default async function PlayersPage() {
  const groups = (await getPlayersByPosition()).map(([position, players]) => ({ position, label: POSITION_LABEL[position], players }));
  const live = isLiveData();
  // 'YYYY-YY FK1리그' → 'YYYY-YY'
  const appsSeason = live ? LEAGUE.statsSeason.split(" ")[0] : null;
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
        {live && anyApps && (
          <p className={styles.note}>
            출전: {LEAGUE.statsSeason.split(" ")[0]} 기록 / 자료: {LEAGUE.source}
          </p>
        )}
      </div>
    </>
  );
}
