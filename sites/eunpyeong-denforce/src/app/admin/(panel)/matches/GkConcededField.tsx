"use client";

import { useState } from "react";
import { useFieldError } from "@/components/admin/AdminForm";
import styles from "@/components/admin/admin.module.css";
import local from "./matches.module.css";

export type GkPlayer = { id: string; name: string; number: number | null; position: string; is_active: boolean };
export type GkInitialRow = { player_id: string; conceded: number };

type RowState = { key: number; playerId: string; conceded: string };

/**
 * 골키퍼 실점 (D-098) — 연맹 결과기록지에 없어 직접 넣는다. 한 경기에 여러 명(교체) 가능.
 * 골레이로가 아닌 선수는 '그래도 넣기'를 체크해야 저장된다. 합계는 상대 득점을 넘지 못한다(서버와 DB 가 다시 검사).
 * 서버 규약: gk_player[], gk_conceded[] (같은 순서), gk_force[] = 골레이로가 아니어도 넣을 선수 ID
 */
export function GkConcededField({ players, initial }: { players: GkPlayer[]; initial: GkInitialRow[] }) {
  const error = useFieldError("gk");
  const [rows, setRows] = useState<RowState[]>(() => initial.map((r, i) => ({ key: i, playerId: r.player_id, conceded: String(r.conceded) })));
  const [nextKey, setNextKey] = useState(initial.length);
  const byId = new Map(players.map((p) => [p.id, p]));
  // 골레이로 먼저 (활동 중 → 비활동), 그 밖의 선수는 아래 묶음
  const gks = players.filter((p) => p.position === "GK");
  const others = players.filter((p) => p.position !== "GK");
  const label = (p: GkPlayer) => `${p.number ?? ""} ${p.name}${p.is_active ? "" : " (비활동)"}`.trim();

  const update = (key: number, patch: Partial<RowState>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <fieldset className={local.gk} aria-describedby={error ? "e-gk" : undefined}>
      <legend className={styles.label}>골키퍼 실점</legend>
      {/* 이 칸이 폼에 있다는 표시 — 없으면(새 경기, 마이그레이션 전) 서버가 골키퍼 줄을 건드리지 않는다 */}
      <input type="hidden" name="gk_present" value="1" />
      <span className={styles.hint}>
        이 경기에 뛴 골키퍼마다 실점을 넣습니다(교체했으면 여러 줄). 합계는 상대 득점을 넘을 수 없습니다. 상태가 &apos;종료&apos;일 때만 저장됩니다.
      </span>
      {rows.map((r, i) => {
        const p = byId.get(r.playerId);
        const notGk = Boolean(p && p.position !== "GK");
        return (
          <div key={r.key} className={local.gkRow}>
            <label className={local.gkPick}>
              <span className="sr-only">골키퍼 {i + 1}</span>
              <select name="gk_player" value={r.playerId} onChange={(e) => update(r.key, { playerId: e.target.value })} className={styles.select}>
                <option value="">선수 고르기</option>
                <optgroup label="골레이로">
                  {gks.map((g) => (
                    <option key={g.id} value={g.id}>
                      {label(g)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="다른 포지션">
                  {others.map((g) => (
                    <option key={g.id} value={g.id}>
                      {label(g)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className={local.gkNum}>
              <span className="sr-only">골키퍼 {i + 1} 실점</span>
              <input
                name="gk_conceded"
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                value={r.conceded}
                onChange={(e) => update(r.key, { conceded: e.target.value })}
                className={styles.input}
              />
            </label>
            <span className={styles.hint}>실점</span>
            <button type="button" className={`${styles.buttonGhost} ${styles.buttonSmall}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
              빼기
            </button>
            {notGk && (
              <label className={`${styles.check} ${local.gkForce}`}>
                <input type="checkbox" name="gk_force" value={r.playerId} />
                골레이로가 아닌 선수입니다. 그래도 넣기
              </label>
            )}
          </div>
        );
      })}
      <div>
        <button
          type="button"
          className={`${styles.buttonGhost} ${styles.buttonSmall}`}
          onClick={() => {
            setRows((rs) => [...rs, { key: nextKey, playerId: "", conceded: "" }]);
            setNextKey((k) => k + 1);
          }}
        >
          + 골키퍼 줄 추가
        </button>
      </div>
      {error && (
        <span className={styles.error} id="e-gk">
          {error}
        </span>
      )}
    </fieldset>
  );
}
