// 데이터 소스 계약 — 정적 / DB 두 구현이 같은 모양을 돌려준다. 정렬·필터는 repo.ts 가 한다.
import type { ClubSettings, HistoryItem, Match, NewsPost, Player, Posting, Sponsor, Staff, StandingRow } from "@/types";

export type DataSource = {
  clubSettings(): Promise<ClubSettings>;
  /** 표시 순서대로 */
  history(): Promise<HistoryItem[]>;
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
};
