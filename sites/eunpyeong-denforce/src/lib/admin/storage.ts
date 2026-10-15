import "server-only";
import { MEDIA_BUCKET, SUPABASE_URL } from "@/lib/supabase/config";
import type { AdminContext } from "./auth";
import type { FormReader } from "./form";
import { planImageList } from "./image-list";

// 이미지 업로드 — Supabase Storage 'media' 버킷 (공개 읽기, 관리자만 쓰기: 마이그레이션 정책)

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const UPLOAD_FAILED = "이미지를 올리지 못했습니다. 다시 시도해 주세요.";

export type ImageFolder = "news" | "players" | "staff" | "sponsors";

/** 형식·크기 검사. 문제가 있으면 오류 문구 */
function checkImage(file: File): string | null {
  if (!EXT_BY_TYPE[file.type]) return "JPG·PNG·WEBP·GIF 이미지만 올릴 수 있습니다.";
  if (file.size > MAX_IMAGE_BYTES) return "이미지는 5MB 이하만 올릴 수 있습니다.";
  return null;
}

/** 검사를 마친 파일을 올리고 공개 URL 을 돌려준다. 실패하면 null */
async function upload(ctx: AdminContext, folder: ImageFolder, file: File): Promise<string | null> {
  const path = `${folder}/${crypto.randomUUID()}.${EXT_BY_TYPE[file.type]}`;
  const { error } = await ctx.supabase.storage.from(MEDIA_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return null;
  return ctx.supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

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

  const invalid = checkImage(file);
  if (invalid) {
    reader.errors[name] = invalid;
    return current;
  }
  const url = await upload(ctx, folder, file);
  if (!url) {
    reader.errors[name] = UPLOAD_FAILED;
    return current;
  }
  return url;
}

export type ResolvedImages = {
  /** 저장할 목록 — 남긴 기존 사진 + 새 사진 순 */
  urls: string[];
  /** 이번에 올린 사진 — DB 저장이 실패하면 지운다 */
  uploaded: string[];
  /** 빼기로 한 기존 사진 — DB 저장이 성공한 뒤에 지운다 */
  removed: string[];
};

/**
 * 여러 장 이미지 필드 처리. 폼 규약 (ImagesField 컴포넌트):
 *   <name>        새 파일 여러 개 (선택)
 *   <name>_remove 지울 기존 사진 URL (체크박스 여러 개)
 * 하나라도 형식·크기가 틀리거나 업로드에 실패하면 아무것도 바꾸지 않는다 (올린 것은 바로 지움).
 * 실패 시 reader 에 오류를 남기고 current 그대로 반환.
 */
export async function resolveImages(
  ctx: AdminContext,
  reader: FormReader,
  name: string,
  folder: ImageFolder,
  current: string[],
  max: number,
): Promise<ResolvedImages> {
  const unchanged: ResolvedImages = { urls: current, uploaded: [], removed: [] };
  const files = reader.files(name);
  const plan = planImageList(current, reader.values(`${name}_remove`), files.length, max);
  if (plan.overLimit) {
    reader.errors[name] = `사진은 최대 ${max}장까지 둘 수 있습니다.`;
    return unchanged;
  }
  for (const file of files) {
    const invalid = checkImage(file);
    if (invalid) {
      reader.errors[name] = `${file.name}: ${invalid}`;
      return unchanged;
    }
  }

  const uploaded: string[] = [];
  for (const file of files) {
    const url = await upload(ctx, folder, file);
    if (!url) {
      await removeImages(ctx, uploaded);
      reader.errors[name] = UPLOAD_FAILED;
      return unchanged;
    }
    uploaded.push(url);
  }
  return { urls: [...plan.kept, ...uploaded], uploaded, removed: plan.removed };
}

/** 우리 버킷에 올린 이미지만 저장소에서 지운다 (정적 경로 /photos/... 등은 무시). 실패해도 저장은 진행. */
export async function removeImages(ctx: AdminContext, urls: Array<string | null | undefined>): Promise<void> {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const paths = urls.filter((u): u is string => Boolean(u?.startsWith(prefix))).map((u) => u.slice(prefix.length));
  if (paths.length > 0) await ctx.supabase.storage.from(MEDIA_BUCKET).remove(paths);
}

export async function removeImage(ctx: AdminContext, url: string | null | undefined): Promise<void> {
  await removeImages(ctx, [url]);
}
