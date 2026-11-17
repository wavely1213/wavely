"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAction, type AdminContext } from "@/lib/admin/auth";
import { canGoLive, goalRowsAllLinked, scorersText } from "@/lib/admin/kfl";
import { TAGS } from "@/lib/cache-tags";

// 관리자 › 연맹 기록 수집 (명세 4.1) — 순서: 권한 → 입력 → DB 다시 읽기 → 쓰기 → updateTag → redirect.
// 출전 줄의 경기 내용(골, 카드, 선발/교체)은 고치지 않는다(BR-032). 연결(link, player_id)만 바꾼다.

const PAGE = "/admin/kfl";
const UUID = /^[0-9a-f-]{36}$/i;

type Ctx = AdminContext;

async function ctxOrLogin(): Promise<Ctx> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");
  return ctx;
}

const back = (error?: string): never => redirect(error ? `${PAGE}?error=${error}` : PAGE);

/** [멈춤 풀기] — 연속 실패로 멈춘 연맹 요청을 다음 실행부터 다시 */
export async function unpauseKfl(): Promise<void> {
  const ctx = await ctxOrLogin();
  const { error } = await ctx.supabase.from("kfl_sync_state").update({ paused_until: null, fail_streak: 0 }).eq("id", 1);
  back(error ? "save" : undefined);
}

/** 그 리그의 '반영된 우리 경기 수'와 '확인할 출전 줄 수' (명세 1.6) */
async function liveCounts(ctx: Ctx, leagueSeq: number): Promise<{ recordedGames: number; reviewRows: number } | null> {
  const { data: games, error } = await ctx.supabase
    .from("kfl_games")
    .select("match_id, applied_hash")
    .eq("league_seq", leagueSeq)
    .not("match_id", "is", null);
  if (error) return null;
  const ids = (games ?? []).map((g) => g.match_id as string);
  let reviewRows = 0;
  if (ids.length) {
    const { count, error: e2 } = await ctx.supabase.from("match_appearances").select("id", { count: "exact", head: true }).in("match_id", ids).eq("link", "review");
    if (e2) return null;
    reviewRows = count ?? 0;
  }
  return { recordedGames: (games ?? []).filter((g) => g.applied_hash).length, reviewRows };
}

/** [공개 켜기] / [공개 끄기] — 켜기는 조건을 서버에서 다시 검사한다 */
export async function setStatsLive(leagueSeq: number, on: boolean): Promise<void> {
  const ctx = await ctxOrLogin();
  if (!Number.isInteger(leagueSeq)) back("save");
  if (on) {
    const counts = await liveCounts(ctx, leagueSeq);
    if (!counts) back("save");
    if (!canGoLive(counts!).ok) back("live");
  }
  const { error } = await ctx.supabase.from("kfl_leagues").update({ stats_live: on, updated_at: new Date().toISOString() }).eq("league_seq", leagueSeq);
  if (error) back("save");
  updateTag(TAGS.records);
  back();
}

/** [다시 확인] — 다음 실행(30분 안)에 이 경기 기록지를 다시 읽는다 */
export async function recheckGame(leagueSeq: number, gameNumber: number): Promise<void> {
  const ctx = await ctxOrLogin();
  const { error } = await ctx.supabase
    .from("kfl_games")
    .update({ next_check_at: new Date().toISOString() })
    .eq("league_seq", leagueSeq)
    .eq("game_number", gameNumber);
  back(error ? "save" : undefined);
}

/** [확인함] — review → reviewed. 그 경기에 확인할 출전 줄이 남아 있으면 바꾸지 않는다 */
export async function markGameReviewed(leagueSeq: number, gameNumber: number): Promise<void> {
  const ctx = await ctxOrLogin();
  const { data: g, error: e1 } = await ctx.supabase.from("kfl_games").select("state, match_id").eq("league_seq", leagueSeq).eq("game_number", gameNumber).maybeSingle();
  if (e1) back("save");
  if (!g || g.state !== "review") back();
  if (g!.match_id) {
    // 읽기 실패를 '남은 줄 0' 으로 보지 않는다 (총괄 검토)
    const { count, error: e2 } = await ctx.supabase.from("match_appearances").select("id", { count: "exact", head: true }).eq("match_id", g!.match_id).eq("link", "review");
    if (e2 || count === null) back("save");
    if ((count ?? 0) > 0) back("rows");
  }
  const { error } = await ctx.supabase
    .from("kfl_games")
    .update({ state: "reviewed" })
    .eq("league_seq", leagueSeq)
    .eq("game_number", gameNumber)
    .eq("state", "review");
  back(error ? "save" : undefined);
}

type AppRow = { id: string; match_id: string; shirt_number: number; link: string; player_id: string | null; suggested_player_id: string | null; goal_minutes: Array<number | null> };

/**
 * 그 경기의 우리 골 줄이 모두 연결됐으면 득점자 줄(matches.scorers)을 다시 쓴다 (명세 2.6, 4.1).
 * 연결 안 된 골 줄이 있으면 그대로 둔다. 실패해도 연결 저장은 유지된다(다음 기록지 반영 때 다시 만든다)
 */
async function rebuildScorers(ctx: Ctx, matchId: string): Promise<void> {
  const [rows, game, players] = await Promise.all([
    ctx.supabase.from("match_appearances").select("shirt_number, link, player_id, goal_minutes").eq("match_id", matchId),
    ctx.supabase.from("kfl_games").select("opp_own_goals").eq("match_id", matchId).maybeSingle(),
    ctx.supabase.from("players").select("id, name"),
  ]);
  if (rows.error || game.error || players.error || !game.data) return;
  const list = (rows.data ?? []) as Array<Pick<AppRow, "shirt_number" | "link" | "player_id" | "goal_minutes">>;
  if (!goalRowsAllLinked(list)) return;
  const scorers = scorersText(
    list
      .filter((r) => r.link === "auto" || r.link === "confirmed")
      .map((r) => ({ shirtNumber: r.shirt_number, playerId: r.player_id, goalMinutes: r.goal_minutes })),
    game.data.opp_own_goals ?? 0,
    players.data ?? [],
  );
  await ctx.supabase.from("matches").update({ scorers }).eq("id", matchId).eq("status", "finished");
}

function afterRows(): void {
  updateTag(TAGS.records);
  updateTag(TAGS.matches);
}

/** 확인할 줄 하나 다시 읽기 (review 가 아니면 null) */
async function reviewRow(ctx: Ctx, id: string): Promise<AppRow | null> {
  if (!UUID.test(id)) return null;
  const { data } = await ctx.supabase
    .from("match_appearances")
    .select("id, match_id, shirt_number, link, player_id, suggested_player_id, goal_minutes")
    .eq("id", id)
    .maybeSingle<AppRow>();
  return data && data.link === "review" ? data : null;
}

/** [연결] — 고른 선수로 확정. '이 시즌 번호표에도 추가'면 그 번호를 번호표에 넣는다 */
export async function linkAppearance(id: string, fd: FormData): Promise<void> {
  const ctx = await ctxOrLogin();
  const playerId = String(fd.get("player_id") ?? "");
  if (!UUID.test(playerId)) back("pick");
  const row = await reviewRow(ctx, id);
  if (!row) back("gone");
  const { data: p } = await ctx.supabase.from("players").select("id").eq("id", playerId).maybeSingle();
  if (!p) back("pick");

  const { error } = await ctx.supabase
    .from("match_appearances")
    .update({ link: "confirmed", player_id: playerId, suggested_player_id: null })
    .eq("id", row!.id)
    .eq("link", "review");
  // 같은 경기 다른 줄에 이미 연결된 선수면 고유 색인(match_id, player_id) 위반 23505 (총괄 검토)
  if (error) back(error.code === "23505" ? "twice" : "save");

  let numberError = false;
  if (fd.get("add_number") === "on") {
    const { data: g } = await ctx.supabase.from("kfl_games").select("league_seq").eq("match_id", row!.match_id).maybeSingle();
    const { data: l } = g ? await ctx.supabase.from("kfl_leagues").select("season").eq("league_seq", g.league_seq).maybeSingle() : { data: null };
    if (l?.season) {
      const { error: e2 } = await ctx.supabase.from("player_season_numbers").insert({ season: l.season, number: row!.shirt_number, player_id: playerId });
      // 그사이 다른 선수가 그 번호에 들어갔으면(23505) 번호표는 그대로 두고 알린다
      numberError = Boolean(e2);
    } else numberError = true;
  }
  // 골 줄을 연결했을 때만 득점자 줄을 다시 쓴다 — 골 없는 줄 연결로 관리자가 고친 득점자 줄을 덮지 않게 (총괄 검토)
  if (row!.goal_minutes.length > 0) await rebuildScorers(ctx, row!.match_id);
  afterRows();
  back(numberError ? "number" : undefined);
}

/** [우리 선수 아님] — 이 줄을 기록에서 뺀다 */
export async function ignoreAppearance(id: string): Promise<void> {
  const ctx = await ctxOrLogin();
  const row = await reviewRow(ctx, id);
  if (!row) back("gone");
  const { error } = await ctx.supabase
    .from("match_appearances")
    .update({ link: "ignored", player_id: null, suggested_player_id: null })
    .eq("id", row!.id)
    .eq("link", "review");
  if (error) back("save");
  // 득점자 줄은 다시 쓰지 않는다: 골 줄을 빼면 '골 줄 모두 연결'이 아니어서 어차피 안 쓰고, 골 없는 줄이면 관리자 값을 덮을 뿐 (총괄 검토)
  afterRows();
  back();
}

/** [제안대로 모두 연결] — 그 경기의 확인할 줄 중 제안이 있는 줄만. 제안이 없는 줄은 남는다 */
export async function linkAllSuggested(matchId: string): Promise<void> {
  const ctx = await ctxOrLogin();
  if (!UUID.test(matchId)) back("gone");
  const { data, error } = await ctx.supabase
    .from("match_appearances")
    .select("id, link, player_id, suggested_player_id, goal_minutes")
    .eq("match_id", matchId);
  if (error) back("save");
  const all = (data ?? []) as Array<Pick<AppRow, "id" | "link" | "player_id" | "suggested_player_id" | "goal_minutes">>;
  // 이미 연결된 선수, 두 줄 이상에 제안된 선수는 사람이 골라야 한다 — 건너뛰고 알린다 (총괄 검토)
  const linked = new Set(all.filter((r) => r.player_id).map((r) => r.player_id));
  const suggestedCount = new Map<string, number>();
  for (const r of all) if (r.link === "review" && r.suggested_player_id) suggestedCount.set(r.suggested_player_id, (suggestedCount.get(r.suggested_player_id) ?? 0) + 1);
  let skipped = false;
  let goalLinked = false;
  for (const r of all) {
    if (r.link !== "review" || !r.suggested_player_id) continue;
    if (linked.has(r.suggested_player_id) || (suggestedCount.get(r.suggested_player_id) ?? 0) > 1) {
      skipped = true;
      continue;
    }
    const { error: e2 } = await ctx.supabase
      .from("match_appearances")
      .update({ link: "confirmed", player_id: r.suggested_player_id, suggested_player_id: null })
      .eq("id", r.id)
      .eq("link", "review");
    if (e2) {
      if (e2.code === "23505") {
        skipped = true;
        continue;
      }
      afterRows();
      back("save");
    }
    linked.add(r.suggested_player_id);
    if (r.goal_minutes.length > 0) goalLinked = true;
  }
  if (goalLinked) await rebuildScorers(ctx, matchId);
  afterRows();
  back(skipped ? "twice" : undefined);
}
