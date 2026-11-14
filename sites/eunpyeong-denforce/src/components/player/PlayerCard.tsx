import Image from "next/image";
import Link from "next/link";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
import { POSITION_LABEL } from "@/data/people";
import { playerAppsLine } from "@/lib/player-profile";
import type { Player } from "@/types";
import { CaptainBadge } from "./CaptainBadge";
import styles from "./PlayerCard.module.css";

/**
 * 선수 카드 — 사진(없으면 엠블럼), 등번호(확정 때만), 이름, 포지션.
 * appsSeason 이 있으면 카드 아래 출전 줄(구분안 2, BR-025 동명이인 구분): 출전 1경기 이상만 '2025-26 출전 9경기', 아니면 그 줄 높이만 비워 카드 높이를 맞춘다.
 */
export function PlayerCard({ player, appsSeason = null }: { player: Player; appsSeason?: string | null }) {
  const apps = appsSeason ? playerAppsLine(player, appsSeason) : null;
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
        {/* 주장단 C / VC (D-093) — 이름 옆 */}
        <CaptainBadge captain={player.captain} />
      </div>
      <span className={styles.position}>{POSITION_LABEL[player.position]}</span>
      {appsSeason && (
        <span className={styles.apps} aria-hidden={apps ? undefined : true}>
          {apps ?? "\u00a0"}
        </span>
      )}
    </Link>
  );
}

/** scroll: 모바일에서 한 줄 가로 스와이프 (메인용) */
export function PlayerGrid({ players, scroll = false, appsSeason = null }: { players: Player[]; scroll?: boolean; appsSeason?: string | null }) {
  return (
    <div className={`${styles.grid} ${scroll ? styles.scroll : ""}`}>
      {players.map((p) => (
        <PlayerCard key={p.slug} player={p} appsSeason={appsSeason} />
      ))}
    </div>
  );
}
