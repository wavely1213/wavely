import type { MatchStatus } from "@/types";

// 경기 폼·목록이 함께 쓰는 선택지. 서버 액션 검증(choice)도 같은 값을 쓴다.

export const MATCH_STATUSES: readonly MatchStatus[] = ["scheduled", "finished"];
export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = { scheduled: "예정", finished: "종료" };
export const MATCH_STATUS_OPTIONS = MATCH_STATUSES.map((value) => ({ value, label: MATCH_STATUS_LABEL[value] }));

/** 홈/원정 select 값 (DB 는 is_home boolean) */
export const MATCH_SIDES = ["home", "away"] as const;
export const MATCH_SIDE_OPTIONS = [
  { value: "home", label: "홈" },
  { value: "away", label: "원정" },
];
