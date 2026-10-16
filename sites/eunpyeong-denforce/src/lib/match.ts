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

/**
 * 메인 '경기' 카드 2장 (오른쪽 위젯 옆이라 2칸, D-034):
 * 지난 경기 1 + 다음 경기 1, 지난 경기가 없으면 예정 2, 시즌 휴식기(예정 없음)에는 최근 결과 2.
 * finished 는 최근 먼저, upcoming 은 가까운 순.
 */
export function homeMatchItems(finished: Match[], upcoming: Match[], count = 2): Array<{ match: Match; label: string }> {
  if (upcoming.length === 0) return finished.slice(0, count).map((match) => ({ match, label: "지난 경기" }));
  const past = finished.slice(0, Math.min(1, count - 1)).map((match) => ({ match, label: "지난 경기" }));
  const next = upcoming.slice(0, count - past.length).map((match, i) => ({ match, label: i === 0 ? "다음 경기" : "예정" }));
  return [...past, ...next];
}
