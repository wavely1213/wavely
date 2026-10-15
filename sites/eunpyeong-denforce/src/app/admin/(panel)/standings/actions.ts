"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";

// 리그순위 관리 서버 액션 — 모든 액션이 직접 관리자 권한을 확인한다 (페이지 검사에 기대지 않음).
// played·points 는 DB 생성 컬럼(승·무·패에서 계산)이라 쓰지 않는다.

/**
 * DB 범위와 같게: check (≥ 0). 상한은 생성 컬럼(points = 승×3 + 무, played = 승+무+패)이
 * integer 를 넘쳐 DB 오류(22003)가 나지 않도록 폼에서 먼저 막는 값 (9999×3+9999 ≪ 2^31).
 */
const COUNT_MAX = 9999;

function readStanding(f: FormReader) {
  const count = (name: string, label: string) => f.int(name, { label, min: 0, max: COUNT_MAX, required: true });
  return {
    team: f.text("team", { label: "팀", max: 40 }),
    win: count("win", "승"),
    draw: count("draw", "무"),
    loss: count("loss", "패"),
    goals_for: count("goals_for", "득점"),
    goals_against: count("goals_against", "실점"),
    is_us: f.bool("is_us"),
  };
}

export async function createStanding(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const values = readStanding(f);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("standings").insert(values);
  if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };

  updateTag(TAGS.standings);
  redirect("/admin/standings");
}

export async function updateStanding(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 대상 행이 아직 있는지 DB 에서 다시 확인한다
  const { data: current } = await ctx.supabase.from("standings").select("id").eq("id", id).maybeSingle();
  if (!current) return { message: "이미 삭제된 항목입니다." };

  const f = new FormReader(fd);
  const values = readStanding(f);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("standings").update(values).eq("id", id);
  if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };

  updateTag(TAGS.standings);
  redirect("/admin/standings");
}

export async function deleteStanding(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");

  await ctx.supabase.from("standings").delete().eq("id", id);
  updateTag(TAGS.standings);
  redirect("/admin/standings");
}
