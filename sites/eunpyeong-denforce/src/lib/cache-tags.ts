// 공개 데이터 캐시 태그 — 관리자 저장 후 updateTag(TAGS.x) 로 해당 데이터만 갱신한다.
export const TAGS = {
  club: "club",
  history: "history",
  players: "players",
  staff: "staff",
  matches: "matches",
  standings: "standings",
  news: "news",
  postings: "postings",
  sponsors: "sponsors",
} as const;

export type CacheTag = (typeof TAGS)[keyof typeof TAGS];
