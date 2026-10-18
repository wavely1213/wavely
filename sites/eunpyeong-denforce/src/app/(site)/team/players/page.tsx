import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlayerGrid } from "@/components/player/PlayerCard";
import { POSITION_LABEL } from "@/data/people";
import { getPlayersByPosition } from "@/lib/repo";
import styles from "@/styles/prose.module.css";
import { pageMetadata } from "@/lib/page-meta";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("선수", "/team/players");
}

export default async function PlayersPage() {
  const groups = await getPlayersByPosition();
  return (
    <>
      <PageHeader title="선수" current="/team/players" />
      <div className={`container ${styles.body}`}>
        {groups.map(([position, players]) => (
          <section key={position}>
            <h2 className={styles.h2}>
              {POSITION_LABEL[position]} <small className={styles.note}>{position}</small>
            </h2>
            <PlayerGrid players={players} />
          </section>
        ))}
      </div>
    </>
  );
}
