"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";

// 연혁(history_items) 관리 서버 액션 — 모든 액션이 직접 관리자 권한을 확인한다 (페이지 검사에 기대지 않음).
// 순서: 권한 → 입력 검증 → DB 저장 → updateTag → redirect(/admin/club)

// DB check: length(year) between 1 and 20, length(text) between 1 and 300
function readHistory(f: FormReader) {
  return {
    year: f.text("year", { label: "연도", max: 20 }),
    text: f.text("text", { label: "내용", max: 300 }),
    sort_order: f.int("sort_order", { label: "표시 순서", min: 0, max: 9999, required: true }),
  };
}

export async function createHistory(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const values = readHistory(f);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("history_items").insert(values);
  if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };

  updateTag(TAGS.history);
  redirect("/admin/club");
}

export async function updateHistory(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 현재 행이 있는지는 클라이언트가 아니라 DB 에서 다시 확인한다
  const { data: current } = await ctx.supabase.from("history_items").select("id").eq("id", id).maybeSingle();
  if (!current) return { message: "이미 삭제된 항목입니다." };

  const f = new FormReader(fd);
  const values = readHistory(f);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("history_items").update(values).eq("id", id);
  if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };

  updateTag(TAGS.history);
  redirect("/admin/club");
}

export async function deleteHistory(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");

  await ctx.supabase.from("history_items").delete().eq("id", id);
  updateTag(TAGS.history);
  redirect("/admin/club");
}
