// FK리그 표기·출처 문구. 시즌이 바뀌면 여기만 고친다. (자료: 한국풋살연맹 futsal.or.kr)

export const LEAGUE = {
  source: "한국풋살연맹",
  /** 선수 출전·득점 기록의 기준 시즌 */
  statsSeason: "2025-26 FK1리그",
  /** 일정 발표를 기다리는 다음 시즌 */
  nextSeason: "2026-27",
  /** 지금 시즌(대회) — 리그순위 첫 표, 관리자 새 경기·순위의 기본값. 나머지 시즌 순위는 '지난 리그' (D-020) */
  currentCompetition: "2026-27 FK1리그",
} as const;
