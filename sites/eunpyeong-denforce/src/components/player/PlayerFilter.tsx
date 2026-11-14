"use client";

import { useState } from "react";
import { PlayerGrid } from "@/components/player/PlayerCard";
import chip from "@/components/ui/Chip.module.css";
import type { Player, Position } from "@/types";
import styles from "./PlayerFilter.module.css";

export type PlayerGroup = { position: Position; label: string; players: Player[] };

/**
 * 선수 목록 (리디자인 2차 시안 137:11897) — 포지션 칩(전체 / 골레이로 / 픽소 / 아라 / 피보) + 포지션별 묶음.
 * 칩은 누름 버튼(aria-pressed). 선수가 없는 포지션은 칩과 묶음 모두 숨김.
 * appsSeason: 카드 아래 출전 줄 시즌 라벨(구분안 2) — null 이면 출전 줄 없음.
 */
export function PlayerFilter({ groups, appsSeason }: { groups: PlayerGroup[]; appsSeason: string | null }) {
  const shown = groups.filter((g) => g.players.length > 0);
  const [pos, setPos] = useState<Position | "ALL">("ALL");
  const visible = pos === "ALL" ? shown : shown.filter((g) => g.position === pos);
  return (
    <>
      <div className={`${chip.chips} ${styles.chips}`} role="group" aria-label="포지션">
        <button type="button" className={chip.chip} aria-pressed={pos === "ALL"} onClick={() => setPos("ALL")}>
          전체
        </button>
        {shown.map((g) => (
          <button key={g.position} type="button" className={chip.chip} aria-pressed={pos === g.position} onClick={() => setPos(g.position)}>
            {g.label}
          </button>
        ))}
      </div>
      {visible.map((g) => (
        <section key={g.position} className={styles.group} aria-labelledby={`pos-${g.position}`}>
          <h2 id={`pos-${g.position}`} className={styles.h2}>
            {g.label} <span className={styles.en}>{g.position}</span>
          </h2>
          <PlayerGrid players={g.players} appsSeason={appsSeason} />
        </section>
      ))}
    </>
  );
}
