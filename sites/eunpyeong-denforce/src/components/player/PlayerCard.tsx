import Image from "next/image";
import Link from "next/link";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
import { POSITION_LABEL } from "@/data/people";
import type { Player } from "@/types";
import styles from "./PlayerCard.module.css";

export function PlayerCard({ player }: { player: Player }) {
  return (
    <Link href={`/team/players/${player.slug}`} className={styles.card}>
      <div className={styles.photo}>
        {player.photo ? (
          <Image src={player.photo} alt="" fill sizes="(max-width: 720px) 45vw, 220px" />
        ) : (
          <EmblemFallback label={player.number ?? undefined} />
        )}
      </div>
      <div className={styles.info}>
        {/* 등번호가 비어 있으면(시즌 번호 확정 전, BR-025) 이름만 */}
        {player.number != null && <span className={styles.number}>{player.number}</span>}
        <strong className={styles.name}>{player.name}</strong>
      </div>
      <span className={styles.position}>{POSITION_LABEL[player.position]}</span>
    </Link>
  );
}

/** scroll: 모바일에서 한 줄 가로 스와이프 (메인용) */
export function PlayerGrid({ players, scroll = false }: { players: Player[]; scroll?: boolean }) {
  return (
    <div className={`${styles.grid} ${scroll ? styles.scroll : ""}`}>
      {players.map((p) => (
        <PlayerCard key={p.slug} player={p} />
      ))}
    </div>
  );
}
