"use client";

import { useState } from "react";
import { PlayerGrid } from "@/components/player/PlayerCard";
import { POSITION_LABEL } from "@/data/people";
import type { Player, Position } from "@/types";
import styles from "./Tabs.module.css";

export function PlayersPreview({ groups }: { groups: Array<[Position, Player[]]> }) {
  const [pos, setPos] = useState<Position>(groups[0]?.[0] ?? "GK");
  const players = groups.find(([p]) => p === pos)?.[1] ?? [];

  return (
    <>
      <div className={styles.tabs} role="tablist">
        {groups.map(([p]) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={pos === p}
            className={`${styles.tab} ${pos === p ? styles.active : ""}`}
            onClick={() => setPos(p)}
          >
            {POSITION_LABEL[p]}
          </button>
        ))}
      </div>
      <PlayerGrid players={players} />
    </>
  );
}
