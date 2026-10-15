import "server-only";
import { MEDIA_BUCKET, SUPABASE_URL } from "@/lib/supabase/config";
import type { AdminContext } from "./auth";
import type { FormReader } from "./form";

// 이미지 업로드 — Supabase Storage 'media' 버킷 (공개 읽기, 관리자만 쓰기: 마이그레이션 정책)

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type ImageFolder = "news" | "players" | "staff" | "sponsors";

/**
 * 이미지 필드 처리. 폼 규약 (ImageField 컴포넌트):
 *   <name>        새 파일 (선택)
 *   <name>_remove 체크 시 기존 이미지 제거
 * 반환: 저장할 URL (변경 없으면 current 그대로). 실패 시 reader 에 오류를 남기고 current 반환.
 */
export async function resolveImage(
  ctx: AdminContext,
  reader: FormReader,
  name: string,
  folder: ImageFolder,
  current: string | null,
): Promise<string | null> {
  const file = reader.file(name);
  if (!file) return reader.bool(`${name}_remove`) ? null : current;

  const ext = EXT_BY_TYPE[file.type];
  if (!ext) {
    reader.errors[name] = "JPG·PNG·WEBP·GIF 이미지만 올릴 수 있습니다.";
    return current;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    reader.errors[name] = "이미지는 5MB 이하만 올릴 수 있습니다.";
    return current;
  }

  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await ctx.supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    reader.errors[name] = "이미지를 올리지 못했습니다. 다시 시도해 주세요.";
    return current;
  }
  return ctx.supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 우리 버킷에 올린 이미지면 저장소에서 지운다 (정적 경로 /photos/... 등은 무시). 실패해도 저장은 진행. */
export async function removeImage(ctx: AdminContext, url: string | null | undefined): Promise<void> {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`;
  if (!url || !url.startsWith(prefix)) return;
  await ctx.supabase.storage.from(MEDIA_BUCKET).remove([url.slice(prefix.length)]);
}
