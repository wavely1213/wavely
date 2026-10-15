import Image from "next/image";
import Link from "next/link";
import { POSITION_LABEL } from "@/data/people";
import type { Player } from "@/types";
import styles from "./PlayerCard.module.css";

export function PlayerCard({ player }: { player: Player }) {
  return (
    <Link href={`/team/players/${player.slug}`} className={styles.card}>
      <div className={styles.photo}>
        {player.photo ? (
          <Image src={player.photo} alt="" fill sizes="(max-width: 720px) 50vw, 240px" />
        ) : (
          <span className={styles.silhouette} aria-hidden>
            {player.number ?? "-"}
          </span>
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.number}>{player.number ?? "-"}</span>
        <div>
          <strong className={styles.name}>{player.name}</strong>
          <span className={styles.position}>{POSITION_LABEL[player.position]}</span>
        </div>
      </div>
    </Link>
  );
}

export function PlayerGrid({ players }: { players: Player[] }) {
  return (
    <div className={styles.grid}>
      {players.map((p) => (
        <PlayerCard key={p.slug} player={p} />
      ))}
    </div>
  );
}
