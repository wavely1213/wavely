// 공개 데이터 캐시 태그 — 관리자 저장 후 updateTag(TAGS.x) 로 해당 데이터만 갱신한다.
export const TAGS = {
  club: "club",
  history: "history",
  alumni: "alumni",
  players: "players",
  staff: "staff",
  matches: "matches",
  standings: "standings",
  news: "news",
  postings: "postings",
  sponsors: "sponsors",
  /** 홈페이지 내용 — 한 칸짜리 값 / 목록 (D-046) */
  content: "content",
  contentItems: "content-items",
} as const;

export type CacheTag = (typeof TAGS)[keyof typeof TAGS];
