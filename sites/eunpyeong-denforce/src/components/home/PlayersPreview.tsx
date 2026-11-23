"use client";

import Link from "next/link";
import { CaptainBadge } from "@/components/player/CaptainBadge";
import { useState } from "react";
import { EmblemFallback } from "@/components/ui/EmblemFallback";
import { FitImage } from "@/components/ui/FitImage";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { POSITION_LABEL } from "@/data/people";
import type { Player, Position } from "@/types";
import cards from "./PlayersPreview.module.css";
import styles from "./Tabs.module.css";

/**
 * 메인 선수단 (리디자인 D-067, 검정 면 — D-005 변경) — 포지션 탭 + 카드 4장씩(화살표 44 + 점), 휴대폰은 스와이프.
 * 등번호는 확정 전이라 보이지 않는다 (BR-025, 번호 off 기본). 사진은 FitImage(WELCOME 포스터와 촬영본이 섞여 있음, D-050).
 */
export function PlayersPreview({ groups }: { groups: Array<[Position, Player[]]> }) {
  const [pos, setPos] = useState<Position>(groups[0]?.[0] ?? "GK");
  const players = groups.find(([p]) => p === pos)?.[1] ?? [];

  return (
    <>
      <ScrollRow className={`${styles.tabs} ${styles.dark}`} role="tablist" aria-label="포지션" activeKey={pos}>
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
      </ScrollRow>
      {players.length > 0 && (
        // 포지션이 바뀌면 처음 칸부터
        <SwipeRow key={pos} label={`${POSITION_LABEL[pos]} 선수`} perView={4} arrows tone="dark">
          {players.map((p) => (
            <Link key={p.slug} href={`/team/players/${p.slug}`} className={cards.card}>
              <span className={cards.photo}>
                {p.photo ? <FitImage src={p.photo} sizes="(max-width: 720px) 80vw, 282px" /> : <EmblemFallback />}
              </span>
              {/* 이름 옆 주장단 C / VC (D-093, 피그마 252:26286 — 검정 면에도 같은 파랑 배지) */}
              <span className={cards.nameRow}>
                <strong className={cards.name}>{p.name}</strong>
                <CaptainBadge captain={p.captain} />
              </span>
              <span className={cards.position}>{POSITION_LABEL[p.position]}</span>
            </Link>
          ))}
        </SwipeRow>
      )}
    </>
  );
}
