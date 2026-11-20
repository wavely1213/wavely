// 선수단 › 유스 — 구단 유스 팀 목록 (소유자 2026-11-12 '이름 + 엠블럼만'). 팀이 늘면 여기에 한 줄 더한다.
// 소개 글은 관리자 › 홈페이지 내용 › 선수단 'youth.intro'(비우면 보이지 않음). 입단/테스트 문의 연락처는 넣지 않는다(BR-026 취지).

export type YouthTeam = {
  /** 팀 이름 (화면 그대로) */
  name: string;
  /** public 아래 엠블럼 경로 (투명 PNG) */
  emblem: string;
  /** 엠블럼 원본 픽셀 [가로, 세로] */
  pixels: [number, number];
};

export const YOUTH_TEAMS: YouthTeam[] = [
  // 아카데미컬 FC 엠블럼 — 소유자 확정(2026-11-03), 아카데미 사이트 보류와 별개로 이번에 사이트 사용 허락(2026-11-12)
  { name: "서울은평 아카데미컬 FC", emblem: "/brand/academy/academical-fc-emblem.png", pixels: [600, 827] },
];
