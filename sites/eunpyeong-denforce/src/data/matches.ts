// 경기·순위. 2026-27 시즌 일정이 확정되지 않아 자리표시 데이터다 (KNOWN_ISSUES 참고).
import type { Match, StandingRow } from "@/types";

const COMP = "FK리그 2026-27";
const HOME = "은평다목적체육관";

export const MATCHES: Match[] = [
  { id: "r1", competition: COMP, round: "1R", kickoff: "2026-10-03T15:00:00+09:00", venue: HOME, isHome: true, opponent: "상대팀 A", status: "finished", score: { us: 4, them: 2 } },
  { id: "r2", competition: COMP, round: "2R", kickoff: "2026-10-10T17:00:00+09:00", venue: "원정 경기장", isHome: false, opponent: "상대팀 B", status: "finished", score: { us: 2, them: 2 } },
  { id: "r3", competition: COMP, round: "3R", kickoff: "2026-10-24T15:00:00+09:00", venue: HOME, isHome: true, opponent: "상대팀 C", status: "scheduled", score: null },
  { id: "r4", competition: COMP, round: "4R", kickoff: "2026-10-31T17:00:00+09:00", venue: "원정 경기장", isHome: false, opponent: "상대팀 D", status: "scheduled", score: null },
  { id: "r5", competition: COMP, round: "5R", kickoff: "2026-11-07T15:00:00+09:00", venue: HOME, isHome: true, opponent: "상대팀 E", status: "scheduled", score: null },
];

export const STANDINGS: StandingRow[] = [
  { id: "s1", team: "서울은평 덴포스", played: 2, win: 1, draw: 1, loss: 0, goalsFor: 6, goalsAgainst: 4, points: 4, isUs: true },
  { id: "s2", team: "상대팀 A", played: 2, win: 1, draw: 0, loss: 1, goalsFor: 5, goalsAgainst: 5, points: 3 },
  { id: "s3", team: "상대팀 B", played: 2, win: 0, draw: 2, loss: 0, goalsFor: 3, goalsAgainst: 3, points: 2 },
  { id: "s4", team: "상대팀 C", played: 2, win: 0, draw: 1, loss: 1, goalsFor: 2, goalsAgainst: 4, points: 1 },
];
