// 데이터 소스 계약 — 정적 / DB 두 구현이 같은 모양을 돌려준다. 정렬·필터는 repo.ts 가 한다.
import type { ContentItem } from "@/lib/content/lists";
import type { ClubSettings, HistoryItem, Match, NationalTeamAlumnus, NewsPost, Player, Posting, Sponsor, Staff, StandingRow } from "@/types";

export type DataSource = {
  clubSettings(): Promise<ClubSettings>;
  /** 표시 순서대로 */
  history(): Promise<HistoryItem[]>;
  /** 배출 풋살 국가대표, 표시 순서대로 */
  nationalTeamAlumni(): Promise<NationalTeamAlumnus[]>;
  /** 활동 중인 선수만 */
  players(): Promise<Player[]>;
  /** 표시 순서대로 */
  staff(): Promise<Staff[]>;
  matches(): Promise<Match[]>;
  standings(): Promise<StandingRow[]>;
  /** 공개(published) 글만 */
  news(): Promise<NewsPost[]>;
  /** 공개(published) 글만 */
  postings(): Promise<Posting[]>;
  /** 표시 순서대로 */
  sponsors(): Promise<Sponsor[]>;
  /** 홈페이지 내용 — 바꾼 값만 { key: value } (D-046) */
  siteContent(): Promise<Record<string, string>>;
  /** 홈페이지 내용 목록 전체 — 목록별·표시 순서대로 */
  contentItems(): Promise<ContentItem[]>;
};
