// 선수 기록 시즌 (명세 1.6, 3.1) + 선수 상세 기록 줄 안A (피그마 302:29926 [확정 2026-11-16], D-098). 순수 (테스트: player-season.test.ts)
// - 기록 공개(stats_live)가 켜진 활성 리그가 있으면 그 시즌 = 연맹 결과기록지 출전 줄 합계(뷰 player_season_stats)
// - 없으면 지금처럼 players 고정 칸(2025-26) — 화면이 바뀌지 않는다
import type { GkSeasonStat, KflLeague, Player, PlayerSeasonStat } from "@/types";

export type StatsSeason = {
  /** 기록 시즌 표기 — '2026-27 FK1리그' / 고정 칸이면 LEAGUE.statsSeason */
  label: string;
  /** 기록 공개가 켜진 활성 리그 — 없으면 null(고정 칸) */
  league: KflLeague | null;
};

/** 보이는 기록 시즌 — active + stats_live 인 리그 중 시즌이 가장 늦은 것. 없으면 고정 칸 시즌 */
export function resolveStatsSeason(leagues: KflLeague[], fallback: string, leagueName: string): StatsSeason {
  const live = leagues.filter((l) => l.active && l.statsLive).sort((a, b) => b.season.localeCompare(a.season))[0];
  return live ? { label: `${live.season} ${leagueName}`, league: live } : { label: fallback, league: null };
}

export type SeasonNumbers = { apps: number; starts: number; goals: number; yellows: number; reds: number };

const ZERO: SeasonNumbers = { apps: 0, starts: 0, goals: 0, yellows: 0, reds: 0 };

/** 그 리그에서 이 선수의 합계 — 줄이 없으면 0 */
export function seasonNumbers(playerId: string, league: KflLeague, rows: PlayerSeasonStat[]): SeasonNumbers {
  const r = rows.find((x) => x.playerId === playerId && x.competition === league.competition);
  return r ? { apps: r.apps, starts: r.starts, goals: r.goals, yellows: r.yellows, reds: r.reds } : ZERO;
}

/**
 * 목록 카드, 프로필 칸, 미리보기 설명이 쓰는 stats 를 기록 시즌 값으로 바꾼 선수.
 * 고정 칸이면 그대로. 연맹 기록에는 도움이 없어 0(BR-009 로 숨는다)
 */
export function withSeasonStats(player: Player, season: StatsSeason, rows: PlayerSeasonStat[]): Player {
  if (!season.league) return player;
  const n = seasonNumbers(player.id, season.league, rows);
  return { ...player, stats: { apps: n.apps, goals: n.goals, assists: 0 } };
}

export type RecordItem = { label: "선발" | "득점" | "경고" | "퇴장"; value: number; card?: "yellow" | "red" };

/** 선수 상세 기록 줄 안A — 큰 줄 + 작은 줄 + 출처 줄, 또는 0경기 + 안내 줄 */
export type SeasonRecord =
  | { kind: "played"; big: string; small: RecordItem[]; source: string }
  | { kind: "none"; big: string; guide: string };

/**
 * 안A (피그마 302:29939 / 29971 / 30006 / 30038 / 30073)
 * - 필드: '12경기 / 10골' + [선발 9  경고 2  퇴장 0]
 * - 골레이로: '12경기 / 실점 18' + [선발 12  득점 0  경고 1  퇴장 0], 출처 줄 끝에 ' / 실점: 구단 입력'.
 *   실점 줄을 하나도 넣지 않았으면 '실점 -' (0 이라고 적지 않는다)
 * - 0경기: '0경기' + '2026-27 시즌 출장 기록이 아직 없습니다'
 */
export function seasonRecord(input: {
  player: Pick<Player, "id" | "position">;
  season: StatsSeason & { league: KflLeague };
  rows: PlayerSeasonStat[];
  gk: GkSeasonStat[];
  sourceName: string;
}): SeasonRecord {
  const { player, season } = input;
  const n = seasonNumbers(player.id, season.league, input.rows);
  if (n.apps === 0) return { kind: "none", big: "0경기", guide: `${season.league.season} 시즌 출장 기록이 아직 없습니다` };
  const source = `출장/선발/득점/경고/퇴장: ${season.label} 기록지 / 자료: ${input.sourceName}`;
  const cards: RecordItem[] = [
    { label: "경고", value: n.yellows, card: "yellow" },
    { label: "퇴장", value: n.reds, card: "red" },
  ];
  if (player.position === "GK") {
    const gk = input.gk.find((g) => g.playerId === player.id && g.competition === season.league.competition);
    return {
      kind: "played",
      big: `${n.apps}경기 / 실점 ${gk ? gk.conceded : "-"}`,
      small: [{ label: "선발", value: n.starts }, { label: "득점", value: n.goals }, ...cards],
      source: `${source} / 실점: 구단 입력`,
    };
  }
  return { kind: "played", big: `${n.apps}경기 / ${n.goals}골`, small: [{ label: "선발", value: n.starts }, ...cards], source };
}
