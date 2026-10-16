"use server";

import { updateTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, type ActionState } from "@/lib/admin/form";
import { PREVIEW_IMAGE_ACCEPT, removeImages, resolveImage } from "@/lib/admin/storage";

// 링크 미리보기 이미지(club_settings.og_image_url·admin_og_image_url) 서버 액션 (D-037)
// 순서: 권한 → 현재 값(DB) → 이미지 업로드 → DB 저장 → 바뀐 옛 이미지 삭제 → updateTag. 같은 화면에 머문다.
// 구단정보 글 폼과 따로 저장한다 — 글만 고칠 때 이미지가, 이미지만 바꿀 때 글이 덮이지 않게.

const FIELDS = [
  { name: "og_image", column: "og_image_url" },
  { name: "admin_og_image", column: "admin_og_image_url" },
] as const;

type PreviewRow = { og_image_url: string | null; admin_og_image_url: string | null };

export async function savePreviewImages(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 현재 값은 클라이언트가 아니라 DB 에서 다시 읽는다
  const { data: current, error: readError } = await ctx.supabase
    .from("club_settings")
    .select("og_image_url, admin_og_image_url")
    .eq("id", 1)
    .maybeSingle<PreviewRow>();
  if (readError) return { message: dbErrorMessage(readError) };
  if (!current) return { message: "구단정보를 먼저 저장해 주세요." };

  const f = new FormReader(fd);
  const next: PreviewRow = { ...current };
  for (const { name, column } of FIELDS) {
    next[column] = await resolveImage(ctx, f, name, "og", current[column], PREVIEW_IMAGE_ACCEPT);
  }
  // 이번에 새로 올린 파일 (바뀌었고 null 이 아님 = 업로드) — 저장이 안 되면 지운다
  const uploaded = FIELDS.map(({ column }) => next[column]).filter((url, i) => url && url !== current[FIELDS[i].column]);
  if (f.hasErrors) {
    await removeImages(ctx, uploaded);
    return { message: "입력값을 확인해 주세요.", errors: { ...f.errors } };
  }

  const { error } = await ctx.supabase.from("club_settings").update(next).eq("id", 1);
  if (error) {
    await removeImages(ctx, uploaded);
    return { message: dbErrorMessage(error) };
  }
  // 바꾸거나 지운 옛 이미지 (우리 저장소에 올린 것만 지워진다)
  await removeImages(
    ctx,
    FIELDS.map(({ column }) => current[column]).filter((url, i) => url && url !== next[FIELDS[i].column]),
  );

  updateTag(TAGS.club);
  return {
    ok: true,
    message: "저장했습니다. 카카오톡에 예전 이미지가 계속 보이면 아래 안내대로 카카오 캐시를 초기화해 주세요.",
  };
}
