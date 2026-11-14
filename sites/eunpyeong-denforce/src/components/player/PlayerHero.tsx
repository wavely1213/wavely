import { EmblemFallback } from "@/components/ui/EmblemFallback";
import { FitImage } from "@/components/ui/FitImage";
import type { Player } from "@/types";
import { CAPTAIN_LABEL } from "@/lib/captain";
import styles from "./PlayerHero.module.css";

/**
 * 선수 상세 머리 (리디자인 2차 시안 PlayerHero 132:816, D-068, BR-031) — 전폭 black-soft 면.
 * 사진(FitImage 3:4, 폭 400) + 포지션 라벨(yellow) + h1 이름 + 기록 '12경기 / 10골'(출처 줄) 또는 '합류 2026-27 시즌'.
 * 등번호는 확정됐을 때만 이름 앞 'No.' (BR-025).
 */
export function PlayerHero({
  player,
  positionLabel,
  record,
  joinSeason,
  source,
}: {
  player: Player;
  positionLabel: string;
  /** '12경기 / 10골' — 합류 선수면 null */
  record: string | null;
  /** 합류 시즌 '2026-27' — record 가 없을 때 */
  joinSeason: string | null;
  /** 기록 출처 줄 — 실데이터일 때만 */
  source: string | null;
}) {
  return (
    <section className={styles.hero} data-surface="dark" aria-labelledby="player-name">
      <div className={`container ${styles.inner}`}>
        <div className={styles.photo}>
          {player.photo ? (
            <FitImage src={player.photo} alt={player.name} sizes="(max-width: 720px) 100vw, 400px" priority />
          ) : (
            <EmblemFallback label={player.number ?? undefined} />
          )}
        </div>
        <div className={styles.info}>
          <p className={styles.position}>
            {positionLabel} ({player.position})
            {/* 주장단 — 포지션 옆 12, 같은 글자 (D-093, 피그마 252:26616 / 252:26638 / 252:26660) */}
            {player.captain && <span className={styles.captain}>{CAPTAIN_LABEL[player.captain]}</span>}
          </p>
          <h1 id="player-name" className={styles.name}>
            {player.number != null && <span className={styles.number}>No.{player.number} </span>}
            {player.name}
          </h1>
          {record ? (
            <>
              <p className={styles.record}>{record}</p>
              {source && <p className={styles.source}>{source}</p>}
            </>
          ) : (
            joinSeason && <p className={styles.join}>합류 {joinSeason} 시즌</p>
          )}
        </div>
      </div>
    </section>
  );
}
