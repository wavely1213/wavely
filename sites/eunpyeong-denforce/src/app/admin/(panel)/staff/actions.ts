"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import { removeImage, resolveImage } from "@/lib/admin/storage";
import type { StaffRow } from "@/lib/data/rows";

// 코칭스태프 관리 서버 액션 — 모든 액션이 직접 관리자 권한을 확인한다 (페이지 검사에 기대지 않음).
// 순서: 권한 → 입력 검증 → 이미지 업로드 → DB 저장 → updateTag → redirect

function readStaff(f: FormReader) {
  return {
    role: f.text("role", { label: "직책", max: 40 }),
    name: f.text("name", { label: "이름", max: 40 }),
    sort_order: f.int("sort_order", { label: "표시 순서", min: 0, max: 9999, required: true }),
  };
}

export async function createStaff(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const values = readStaff(f);
  if (f.hasErrors) return f.state();

  const photo_url = await resolveImage(ctx, f, "photo", "staff", null);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("staff").insert({ ...values, photo_url });
  if (error) {
    // 저장 실패 시 방금 올린 사진은 고아가 되므로 지운다
    await removeImage(ctx, photo_url);
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }

  updateTag(TAGS.staff);
  redirect("/admin/staff");
}

export async function updateStaff(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 현재 값은 클라이언트가 아니라 DB 에서 다시 읽는다
  const { data: current } = await ctx.supabase
    .from("staff")
    .select("photo_url")
    .eq("id", id)
    .maybeSingle<Pick<StaffRow, "photo_url">>();
  if (!current) return { message: "이미 삭제된 항목입니다." };

  const f = new FormReader(fd);
  const values = readStaff(f);
  if (f.hasErrors) return f.state();

  const photo_url = await resolveImage(ctx, f, "photo", "staff", current.photo_url);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("staff").update({ ...values, photo_url }).eq("id", id);
  if (error) {
    // 새로 올린 사진만 정리 (기존 사진은 그대로 둔다)
    if (photo_url !== current.photo_url) await removeImage(ctx, photo_url);
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }
  if (photo_url !== current.photo_url) await removeImage(ctx, current.photo_url);

  updateTag(TAGS.staff);
  redirect("/admin/staff");
}

export async function deleteStaff(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");

  const { data } = await ctx.supabase
    .from("staff")
    .delete()
    .eq("id", id)
    .select("photo_url")
    .maybeSingle<Pick<StaffRow, "photo_url">>();
  await removeImage(ctx, data?.photo_url);
  updateTag(TAGS.staff);
  redirect("/admin/staff");
}
