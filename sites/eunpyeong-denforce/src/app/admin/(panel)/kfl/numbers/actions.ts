"use server";

import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/auth";

// 관리자 › 연맹 기록 수집 › 시즌 번호표 (명세 4.2) — 결과기록지 번호 → 우리 선수.
// 번호를 바꿔도 이미 연결된 출전 기록은 그대로다(그 뒤에 읽는 기록지부터). 공개 화면 캐시와 무관(번호표는 관리자만 읽음).

const PAGE = "/admin/kfl/numbers";
const UUID = /^[0-9a-f-]{36}$/i;
const SEASON = /^\d{4}-\d{2}$/;

const back = (season: string, error?: string): never =>
  redirect(`${PAGE}?season=${encodeURIComponent(season)}${error ? `&error=${error}` : ""}`);

function readNumber(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (!/^\d{1,2}$/.test(s)) return null;
  return Number(s);
}

async function ctxOrLogin() {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");
  return ctx;
}

/** 번호 추가 — 같은 번호가 있으면 23505 → 안내 */
export async function addSeasonNumber(season: string, fd: FormData): Promise<void> {
  const ctx = await ctxOrLogin();
  if (!SEASON.test(season)) redirect(PAGE);
  const number = readNumber(fd.get("number"));
  const playerId = String(fd.get("player_id") ?? "");
  if (number === null) back(season, "number");
  if (!UUID.test(playerId)) back(season, "pick");
  const { error } = await ctx.supabase.from("player_season_numbers").insert({ season, number, player_id: playerId });
  if (error) back(season, error.code === "23505" ? "dup" : "save");
  back(season);
}

/** 그 번호의 선수 바꾸기 */
export async function updateSeasonNumber(season: string, number: number, fd: FormData): Promise<void> {
  const ctx = await ctxOrLogin();
  if (!SEASON.test(season) || !Number.isInteger(number)) redirect(PAGE);
  const playerId = String(fd.get("player_id") ?? "");
  if (!UUID.test(playerId)) back(season, "pick");
  const { error } = await ctx.supabase
    .from("player_season_numbers")
    .update({ player_id: playerId, updated_at: new Date().toISOString() })
    .eq("season", season)
    .eq("number", number);
  back(season, error ? "save" : undefined);
}

export async function deleteSeasonNumber(season: string, number: number): Promise<void> {
  const ctx = await ctxOrLogin();
  if (!SEASON.test(season) || !Number.isInteger(number)) redirect(PAGE);
  const { error } = await ctx.supabase.from("player_season_numbers").delete().eq("season", season).eq("number", number);
  back(season, error ? "save" : undefined);
}

/** [비교 확인함] — 대시보드의 '구단 페이지 명단이 바뀌었습니다' 경고를 끈다 */
export async function ackClubRoster(season: string): Promise<void> {
  const ctx = await ctxOrLogin();
  const { error } = await ctx.supabase.from("kfl_sync_state").update({ club_roster_ack_at: new Date().toISOString() }).eq("id", 1);
  back(SEASON.test(season) ? season : "", error ? "save" : undefined);
}
