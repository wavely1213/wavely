import type { Match } from "@/types";

/** 연속된 같은 대회끼리 묶는다 (목록 순서 유지) */
export function groupByCompetition(matches: Match[]) {
  const groups: Array<{ competition: string; matches: Match[] }> = [];
  for (const m of matches) {
    const last = groups.at(-1);
    if (last && last.competition === m.competition) last.matches.push(m);
    else groups.push({ competition: m.competition, matches: [m] });
  }
  return groups;
}

/** "2025-26 FK1리그 · 1R" — 라운드가 없으면 대회명만 */
export function matchLabel(m: Pick<Match, "competition" | "round">) {
  return m.round ? `${m.competition} · ${m.round}` : m.competition;
}
