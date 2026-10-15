// 정적 데이터 소스 — Supabase 미설정 시 사용 (src/data 의 자리표시 데이터).
import { CLUB_SETTINGS, HISTORY } from "@/data/club";
import { MATCHES, STANDINGS } from "@/data/matches";
import { NEWS } from "@/data/news";
import { PLAYERS, STAFF } from "@/data/people";
import { SPONSORS } from "@/data/sponsors";
import type { DataSource } from "./source";

export const staticSource: DataSource = {
  clubSettings: async () => CLUB_SETTINGS,
  history: async () => HISTORY,
  players: async () => PLAYERS,
  staff: async () => STAFF,
  matches: async () => MATCHES,
  standings: async () => STANDINGS,
  news: async () => NEWS,
  sponsors: async () => SPONSORS,
};
