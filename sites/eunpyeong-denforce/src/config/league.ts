// FK리그 표기·출처 문구. 시즌이 바뀌면 여기만 고친다. (자료: 한국풋살연맹 futsal.or.kr)

export const LEAGUE = {
  source: "한국풋살연맹",
  /** 리그순위 표 제목 — 지금 표에 들어 있는 시즌 */
  standingsTitle: "2025-26 FK1리그 최종 순위",
  /** 선수 출전·득점 기록의 기준 시즌 */
  statsSeason: "2025-26 FK1리그",
  /** 일정 발표를 기다리는 다음 시즌 */
  nextSeason: "2026-27",
  /** 관리자 화면에서 새 경기를 만들 때 대회 기본값 */
  currentCompetition: "2026-27 FK2리그",
} as const;
