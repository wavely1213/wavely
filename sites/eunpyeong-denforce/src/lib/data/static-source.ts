// 정적 데이터 소스 — Supabase 미설정 시 사용 (src/data 의 자리표시 데이터).
import { CLUB_SETTINGS, HISTORY, NATIONAL_TEAM_ALUMNI } from "@/data/club";
import { MATCHES, STANDINGS } from "@/data/matches";
import { NEWS } from "@/data/news";
import { PLAYERS, STAFF } from "@/data/people";
import { POSTINGS } from "@/data/postings";
import { SPONSORS } from "@/data/sponsors";
import { CONTENT_LISTS, type ContentItem, type ListDef } from "@/lib/content/lists";
import type { DataSource } from "./source";

/** 정적 모드 목록 — 코드의 기본 목록 그대로 */
const STATIC_ITEMS: ContentItem[] = Object.entries(CONTENT_LISTS).flatMap(([list, def]: [string, ListDef]) =>
  def.defaults.map((d, i) => ({
    id: `${list}-${i + 1}`,
    list,
    title: d.title ?? "",
    body: d.body ?? "",
    link: d.link ?? "",
    image: d.image ?? null,
    sortOrder: (i + 1) * 10,
  })),
);

export const staticSource: DataSource = {
  clubSettings: async () => CLUB_SETTINGS,
  history: async () => HISTORY,
  nationalTeamAlumni: async () => NATIONAL_TEAM_ALUMNI,
  players: async () => PLAYERS,
  staff: async () => STAFF,
  matches: async () => MATCHES,
  standings: async () => STANDINGS,
  news: async () => NEWS,
  postings: async () => POSTINGS,
  sponsors: async () => SPONSORS,
  siteContent: async () => ({}),
  contentItems: async () => STATIC_ITEMS,
};
