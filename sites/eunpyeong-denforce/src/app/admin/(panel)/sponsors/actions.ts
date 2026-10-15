"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import { removeImage, resolveImage } from "@/lib/admin/storage";
import type { SponsorTier } from "@/types";

// 스폰서 관리 서버 액션 — 모든 액션이 직접 관리자 권한을 확인한다 (페이지 검사에 기대지 않음).
// 순서: 권한 → 입력 검증 → 이미지 업로드 → DB 저장 → updateTag → redirect

const TIERS: readonly SponsorTier[] = ["naming", "official", "partner"];

function readSponsor(f: FormReader) {
  return {
    name: f.text("name", { label: "이름", max: 60 }),
    tier: f.choice("tier", TIERS, "등급"),
    url: f.optUrl("url", "링크"),
    sort_order: f.int("sort_order", { label: "표시 순서", min: 0, max: 9999, required: true }),
  };
}

export async function createSponsor(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const values = readSponsor(f);
  if (f.hasErrors) return f.state();

  const logo_url = await resolveImage(ctx, f, "logo", "sponsors", null);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("sponsors").insert({ ...values, logo_url });
  if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };

  updateTag(TAGS.sponsors);
  redirect("/admin/sponsors");
}

export async function updateSponsor(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 현재 값은 클라이언트가 아니라 DB 에서 다시 읽는다
  const { data: current } = await ctx.supabase.from("sponsors").select("logo_url").eq("id", id).maybeSingle();
  if (!current) return { message: "이미 삭제된 항목입니다." };

  const f = new FormReader(fd);
  const values = readSponsor(f);
  if (f.hasErrors) return f.state();

  const logo_url = await resolveImage(ctx, f, "logo", "sponsors", current.logo_url);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("sponsors").update({ ...values, logo_url }).eq("id", id);
  if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };
  if (logo_url !== current.logo_url) await removeImage(ctx, current.logo_url);

  updateTag(TAGS.sponsors);
  redirect("/admin/sponsors");
}

export async function deleteSponsor(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");

  const { data } = await ctx.supabase.from("sponsors").delete().eq("id", id).select("logo_url").maybeSingle();
  await removeImage(ctx, data?.logo_url);
  updateTag(TAGS.sponsors);
  redirect("/admin/sponsors");
}
