// 리그순위 정렬·시즌 묶기 — 순수 함수만 둔다 (테스트: standings.test.ts). 공개 페이지와 관리자 화면이 함께 쓴다.
import type { StandingRow } from "@/types";

type Rankable = Pick<StandingRow, "team" | "points" | "goalsFor" | "goalsAgainst">;

/** BR-001: 승점 → 득실차 → 다득점, 그래도 같으면 팀명 가나다순 (개막 전 0점 표의 순서를 고정) */
export function byRank(a: Rankable, b: Rankable): number {
  return (
    b.points - a.points ||
    b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
    b.goalsFor - a.goalsFor ||
    a.team.localeCompare(b.team, "ko")
  );
}

/** 시즌(대회명) → 주소용 이름: "2025-26 FK1리그" → "2025-26-fk1". 영문·숫자로 못 바꾸면 그대로 인코딩 */
export function seasonSlug(season: string): string {
  const s = season.trim().replace(/리그$/, "").replace(/\s+/g, "-").toLowerCase();
  return /^[a-z0-9-]+$/.test(s) ? s : encodeURIComponent(season.trim());
}

/** 대회명 앞의 시즌 연도: "2025-26 승강 플레이오프" → "2025-26". 연도 범위가 없으면(예: "2026 FK CUP") null */
export function seasonYear(competition: string): string | null {
  return competition.match(/^(\d{4}-\d{2})(?:\s|$)/)?.[1] ?? null;
}

export type PastLeague = {
  season: string;
  slug: string;
  /** BR-001 순서 */
  rows: StandingRow[];
  /** 우리 팀 최종 성적 (표에 없으면 null) */
  us: { rank: number; win: number; draw: number; loss: number } | null;
};

/** 지금 시즌을 뺀 시즌별 최종 순위 — 최근 시즌 먼저 (BR-016) */
export function pastLeagues(rows: StandingRow[], currentSeason: string): PastLeague[] {
  const bySeason = new Map<string, StandingRow[]>();
  for (const r of rows) {
    if (!r.season || r.season === currentSeason) continue;
    bySeason.set(r.season, [...(bySeason.get(r.season) ?? []), r]);
  }
  return [...bySeason.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([season, list]) => {
      const sorted = [...list].sort(byRank);
      const i = sorted.findIndex((r) => r.isUs);
      const us = i < 0 ? null : { rank: i + 1, win: sorted[i].win, draw: sorted[i].draw, loss: sorted[i].loss };
      return { season, slug: seasonSlug(season), rows: sorted, us };
    });
}
