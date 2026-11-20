"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";

// 배출 풋살 국가대표(national_team_alumni) 관리 서버 액션 (D-043) — 모든 액션이 직접 관리자 권한을 확인한다.
// 순서: 권한 → 입력 검증 → DB 저장 → updateTag → redirect(/admin/club)

// DB check: name 1~30자, position 10자 이하, years 1~100자
function readAlumnus(f: FormReader) {
  return {
    name: f.text("name", { label: "이름", max: 30 }),
    position: f.optText("position", { label: "포지션", max: 10 }) ?? "",
    years: f.text("years", { label: "국가대표 발탁", max: 100 }),
    sort_order: f.int("sort_order", { label: "표시 순서", min: 0, max: 9999, required: true }),
  };
}

export async function createAlumnus(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const values = readAlumnus(f);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("national_team_alumni").insert(values);
  if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };

  updateTag(TAGS.alumni);
  redirect("/admin/club");
}

export async function updateAlumnus(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 현재 행이 있는지는 클라이언트가 아니라 DB 에서 다시 확인한다
  const { data: current } = await ctx.supabase.from("national_team_alumni").select("id").eq("id", id).maybeSingle();
  if (!current) return { message: "이미 삭제된 항목입니다." };

  const f = new FormReader(fd);
  const values = readAlumnus(f);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("national_team_alumni").update(values).eq("id", id);
  if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };

  updateTag(TAGS.alumni);
  redirect("/admin/club");
}

export async function deleteAlumnus(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");

  await ctx.supabase.from("national_team_alumni").delete().eq("id", id);
  updateTag(TAGS.alumni);
  redirect("/admin/club");
}
