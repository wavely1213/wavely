import "server-only";
import { CLUB_SETTINGS } from "@/data/club";
import { createPublicClient } from "@/lib/supabase/public";
import type { DataSource } from "./source";
import {
  toClubSettings,
  toHistoryItem,
  toMatch,
  toNewsPost,
  toPlayer,
  toSponsor,
  toStaff,
  toStanding,
  type ClubSettingsRow,
  type HistoryRow,
  type MatchRow,
  type NewsRow,
  type PlayerRow,
  type SponsorRow,
  type StaffRow,
  type StandingDbRow,
} from "./rows";

// Supabase 데이터 소스 — anon 권한으로 공개 데이터만 읽는다 (RLS: 비공개 글 제외).

function unwrap<T>(table: string, res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(`[db] ${table} 조회 실패: ${res.error.message}`);
  return res.data ?? [];
}

export const dbSource: DataSource = {
  async clubSettings() {
    const res = await createPublicClient().from("club_settings").select("*").eq("id", 1).maybeSingle<ClubSettingsRow>();
    if (res.error) throw new Error(`[db] club_settings 조회 실패: ${res.error.message}`);
    return res.data ? toClubSettings(res.data) : CLUB_SETTINGS;
  },
  async history() {
    const res = await createPublicClient().from("history_items").select("*").order("sort_order").returns<HistoryRow[]>();
    return unwrap("history_items", res).map(toHistoryItem);
  },
  async players() {
    const res = await createPublicClient().from("players").select("*").eq("is_active", true).returns<PlayerRow[]>();
    return unwrap("players", res).map(toPlayer);
  },
  async staff() {
    const res = await createPublicClient().from("staff").select("*").order("sort_order").returns<StaffRow[]>();
    return unwrap("staff", res).map(toStaff);
  },
  async matches() {
    const res = await createPublicClient().from("matches").select("*").returns<MatchRow[]>();
    return unwrap("matches", res).map(toMatch);
  },
  async standings() {
    const res = await createPublicClient().from("standings").select("*").returns<StandingDbRow[]>();
    return unwrap("standings", res).map(toStanding);
  },
  async news() {
    const res = await createPublicClient()
      .from("news_posts")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .returns<NewsRow[]>();
    return unwrap("news_posts", res).map(toNewsPost);
  },
  async sponsors() {
    const res = await createPublicClient().from("sponsors").select("*").order("sort_order").returns<SponsorRow[]>();
    return unwrap("sponsors", res).map(toSponsor);
  },
};
