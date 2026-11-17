import "server-only";
import { CLUB_SETTINGS } from "@/data/club";
import { createPublicClient } from "@/lib/supabase/public";
import type { DataSource } from "./source";
import {
  contentMap,
  toAlumnus,
  toContentItem,
  toGkSeason,
  toKflLeague,
  toSeasonStat,
  toClubSettings,
  toHistoryItem,
  toMatch,
  toNewsPost,
  toPlayer,
  toPosting,
  toSponsor,
  toStaff,
  toStanding,
  toTeamCrest,
  type AlumniRow,
  type ClubSettingsRow,
  type ContentItemRow,
  type GkSeasonRow,
  type KflLeagueRow,
  type SeasonStatRow,
  type HistoryRow,
  type MatchRow,
  type NewsRow,
  type PlayerRow,
  type PublicPostingRow,
  type SiteContentRow,
  type SponsorRow,
  type StaffRow,
  type StandingDbRow,
  type TeamCrestRow,
} from "./rows";

// Supabase 데이터 소스 — anon 권한으로 공개 데이터만 읽는다 (RLS: 비공개 글 제외).

function unwrap<T>(table: string, res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(`[db] ${table} 조회 실패: ${res.error.message}`);
  return res.data ?? [];
}

/** 표가 아직 없음(마이그레이션 전) — PostgREST 42P01 / PGRST205 */
function isMissingTable(error: { code?: string; message: string }): boolean {
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message);
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
  async nationalTeamAlumni() {
    const res = await createPublicClient().from("national_team_alumni").select("*").order("sort_order").returns<AlumniRow[]>();
    return unwrap("national_team_alumni", res).map(toAlumnus);
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
  async postings() {
    const res = await createPublicClient()
      .from("postings")
      // 요약(excerpt)은 관리용이라 공개 화면에 보내지 않는다 (목록 전체가 클라이언트로 넘어간다)
      .select("id, kind, platform, title, author, url, thumbnail_url, posted_on")
      .eq("published", true)
      .order("posted_on", { ascending: false })
      .returns<PublicPostingRow[]>();
    return unwrap("postings", res).map(toPosting);
  },
  async sponsors() {
    const res = await createPublicClient().from("sponsors").select("*").order("sort_order").returns<SponsorRow[]>();
    return unwrap("sponsors", res).map(toSponsor);
  },
  async siteContent() {
    const res = await createPublicClient().from("site_content").select("key, value").returns<SiteContentRow[]>();
    return contentMap(unwrap("site_content", res));
  },
  async contentItems() {
    const res = await createPublicClient()
      .from("content_items")
      .select("id, list, title, body, link, image_url, sort_order")
      .order("list")
      .order("sort_order")
      .returns<ContentItemRow[]>();
    return unwrap("content_items", res).map(toContentItem);
  },
  async teamCrests() {
    const res = await createPublicClient().from("team_crests").select("*").order("name").returns<TeamCrestRow[]>();
    // 마이그레이션 전에는 표가 없다 — 코드 목록만 쓰게 빈 목록 (화면이 깨지지 않게)
    if (res.error && isMissingTable(res.error)) return [];
    return unwrap("team_crests", res).map(toTeamCrest);
  },
  // 연맹 기록 (D-082, 명세 3.1) — 표/뷰가 없으면(마이그레이션 전) 빈 목록 = 지금 화면 그대로
  async kflLeagues() {
    const res = await createPublicClient().from("kfl_leagues").select("league_seq, season, competition, active, stats_live").returns<KflLeagueRow[]>();
    if (res.error && isMissingTable(res.error)) return [];
    return unwrap("kfl_leagues", res).map(toKflLeague);
  },
  async seasonStats() {
    const res = await createPublicClient()
      .from("player_season_stats")
      .select("competition, season, player_id, apps, starts, goals, yellows, reds")
      .returns<SeasonStatRow[]>();
    if (res.error && isMissingTable(res.error)) return [];
    return unwrap("player_season_stats", res).map(toSeasonStat);
  },
  async gkSeason() {
    const res = await createPublicClient().from("player_gk_season").select("competition, player_id, games, conceded").returns<GkSeasonRow[]>();
    if (res.error && isMissingTable(res.error)) return [];
    return unwrap("player_gk_season", res).map(toGkSeason);
  },
};
