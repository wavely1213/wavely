"use server";

import { updateTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import { PREVIEW_IMAGE_ACCEPT, removeImages, resolveImage } from "@/lib/admin/storage";

// 링크 미리보기(club_settings.og_* · admin_og_*) 서버 액션 (D-037·D-038)
// 순서: 권한 → 글 검증 → 현재 이미지(DB) → 이미지 업로드 → DB 저장 → 바뀐 옛 이미지 삭제 → updateTag. 같은 화면에 머문다.
// 구단정보 글 폼과 따로 저장한다 — 서로의 칸을 덮지 않게 (각자 자기 칸만 보낸다).

const IMAGES = [
  { name: "og_image", column: "og_image_url" },
  { name: "admin_og_image", column: "admin_og_image_url" },
] as const;

type ImageColumns = { og_image_url: string | null; admin_og_image_url: string | null };

function readTexts(f: FormReader) {
  return {
    og_title: f.optText("og_title", { label: "홈페이지 미리보기 제목", max: 60 }),
    og_description: f.optText("og_description", { label: "홈페이지 미리보기 설명", max: 200 }),
    admin_og_title: f.optText("admin_og_title", { label: "관리자 미리보기 제목", max: 60 }),
    admin_og_description: f.optText("admin_og_description", { label: "관리자 미리보기 설명", max: 200 }),
  };
}

export async function savePreviewSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const texts = readTexts(f);
  if (f.hasErrors) return f.state();

  // 현재 이미지는 클라이언트가 아니라 DB 에서 다시 읽는다
  const { data: current, error: readError } = await ctx.supabase
    .from("club_settings")
    .select("og_image_url, admin_og_image_url")
    .eq("id", 1)
    .maybeSingle<ImageColumns>();
  if (readError) return { message: dbErrorMessage(readError), values: submittedValues(fd) };
  if (!current) return { message: "구단정보를 먼저 저장해 주세요.", values: submittedValues(fd) };

  const images: ImageColumns = { ...current };
  for (const { name, column } of IMAGES) {
    images[column] = await resolveImage(ctx, f, name, "og", current[column], PREVIEW_IMAGE_ACCEPT);
  }
  // 이번에 새로 올린 파일(바뀌었고 null 이 아님) — 저장이 안 되면 지운다
  const uploaded = IMAGES.map(({ column }) => images[column]).filter((url, i) => url && url !== current[IMAGES[i].column]);
  if (f.hasErrors) {
    await removeImages(ctx, uploaded);
    return f.state();
  }

  const { error } = await ctx.supabase.from("club_settings").update({ ...texts, ...images }).eq("id", 1);
  if (error) {
    await removeImages(ctx, uploaded);
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }
  // 바꾸거나 지운 옛 이미지 (우리 저장소에 올린 것만 지워진다)
  await removeImages(
    ctx,
    IMAGES.map(({ column }) => current[column]).filter((url, i) => url && url !== images[IMAGES[i].column]),
  );

  updateTag(TAGS.club);
  return {
    ok: true,
    message: "저장했습니다. 카카오톡에 예전 미리보기가 계속 보이면 아래 안내대로 카카오 캐시를 초기화해 주세요.",
    // 저장한 글을 폼 기본값으로 — 폼 초기화가 예전 값으로 되돌리지 않게 (삭제 체크는 풀림)
    values: Object.fromEntries(Object.entries(texts).map(([k, v]) => [k, v ?? ""])),
  };
}
