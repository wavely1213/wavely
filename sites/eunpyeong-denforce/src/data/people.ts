// 선수단·스태프. 선수 명단은 미확정이라 자리표시 데이터다 (KNOWN_ISSUES 참고).
import type { Player, Position, Staff } from "@/types";

const PLACEHOLDER_ROSTER: Array<[number, Position]> = [
  [1, "GK"], [12, "GK"],
  [3, "FIXO"], [4, "FIXO"], [5, "FIXO"],
  [7, "ALA"], [8, "ALA"], [10, "ALA"], [11, "ALA"], [14, "ALA"],
  [9, "PIVO"], [19, "PIVO"],
];

export const PLAYERS: Player[] = PLACEHOLDER_ROSTER.map(([number, position]) => ({
  slug: `no-${number}`,
  number,
  name: `선수 ${number}`,
  position,
  photo: null,
  birth: null,
  heightCm: null,
  stats: { apps: 0, goals: 0, assists: 0 },
}));

export const STAFF: Staff[] = [
  { slug: "head-coach", role: "감독", name: "장성호", photo: null },
  { slug: "coach", role: "코치", name: "미정", photo: null },
  { slug: "gk-coach", role: "골키퍼 코치", name: "미정", photo: null },
  { slug: "trainer", role: "트레이너", name: "미정", photo: null },
];

export const POSITION_LABEL: Record<Position, string> = {
  GK: "골레이로",
  FIXO: "픽소",
  ALA: "아라",
  PIVO: "피보",
};

export const POSITION_ORDER: Position[] = ["GK", "FIXO", "ALA", "PIVO"];
