import "server-only";
import { MEDIA_BUCKET, SUPABASE_URL } from "@/lib/supabase/config";
import type { AdminContext } from "./auth";
import { driveImportPrefix, isDriveImportUrl } from "./drive";
import type { FormReader } from "./form";
import { planImageList } from "./image-list";
import { bucketPaths } from "./storage-path";

// 이미지 업로드 — Supabase Storage 'media' 버킷 (공개 읽기, 관리자만 쓰기: 마이그레이션 정책)

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const UPLOAD_FAILED = "이미지를 올리지 못했습니다. 다시 시도해 주세요.";
const DRIVE_PREFIX = driveImportPrefix(SUPABASE_URL, MEDIA_BUCKET);
const BAD_DRIVE = "드라이브에서 가져온 사진을 읽지 못했습니다. 다시 골라 주세요.";

/** 드라이브 자료함에서 가져온 사진 주소 (<name>_drive) — 우리 저장소 media/drive/ 아래만 받는다 (D-081) */
function driveUrls(reader: FormReader, name: string): string[] | null {
  const urls = reader.values(`${name}_drive`).filter(Boolean);
  return urls.every((u) => isDriveImportUrl(u, DRIVE_PREFIX)) ? urls : null;
}

export type ImageFolder = "news" | "players" | "staff" | "sponsors" | "postings" | "og" | "content" | "crests" | "matchday";

/** 받을 이미지 형식 제한 — 링크 미리보기(카카오톡·SNS)는 JPG·PNG 만 확실히 보인다 (D-037) */
export type ImageAccept = { types: readonly string[]; label: string };
export const PREVIEW_IMAGE_ACCEPT: ImageAccept = { types: ["image/jpeg", "image/png"], label: "JPG/PNG" };
/** 상대팀 엠블럼 — 투명 바탕이 되는 형식만 (D-094) */
export const CREST_IMAGE_ACCEPT: ImageAccept = { types: ["image/png", "image/webp"], label: "투명 PNG/WebP" };

/** 형식·크기 검사. 문제가 있으면 오류 문구 */
function checkImage(file: File, accept?: ImageAccept): string | null {
  if (!EXT_BY_TYPE[file.type]) return "JPG/PNG/WEBP/GIF 이미지만 올릴 수 있습니다.";
  if (accept && !accept.types.includes(file.type)) return `${accept.label} 이미지만 올릴 수 있습니다.`;
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
 *   <name>_drive  드라이브 자료함에서 가져온 사진 URL (파일이 없을 때만, D-081)
 * 반환: 저장할 URL (변경 없으면 current 그대로). 실패 시 reader 에 오류를 남기고 current 반환.
 * accept: 형식을 더 좁힐 때 (예: PREVIEW_IMAGE_ACCEPT)
 */
export async function resolveImage(
  ctx: AdminContext,
  reader: FormReader,
  name: string,
  folder: ImageFolder,
  current: string | null,
  accept?: ImageAccept,
): Promise<string | null> {
  const file = reader.file(name);
  if (!file) {
    // 파일 대신 드라이브에서 가져온 사진 (이미 저장소에 있다)
    const drive = driveUrls(reader, name);
    if (!drive) {
      reader.errors[name] = BAD_DRIVE;
      return current;
    }
    if (drive.length > 0) return drive[drive.length - 1];
    return reader.bool(`${name}_remove`) ? null : current;
  }

  const invalid = checkImage(file, accept);
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
 *   <name>_drive  드라이브 자료함에서 가져온 사진 URL 여러 개 (이미 저장소에 있다 — 새 파일 뒤에 붙는다, D-081)
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
  const drive = driveUrls(reader, name);
  if (!drive) {
    reader.errors[name] = BAD_DRIVE;
    return unchanged;
  }
  const fresh = drive.filter((u) => !current.includes(u));
  const plan = planImageList(current, reader.values(`${name}_remove`), files.length + fresh.length, max);
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
  // 드라이브 사진은 '이번에 올린 것'에 넣지 않는다 — 저장이 실패해도 지우지 않는다 (자료함 기록이 그 주소를 가리킨다)
  return { urls: [...plan.kept, ...uploaded, ...fresh], uploaded, removed: plan.removed };
}

/**
 * 우리 버킷에 올린 이미지만 저장소에서 지운다 (정적 경로 /photos/... 등은 무시). 실패해도 저장은 진행.
 * 드라이브 자료함 사진(media/drive/…)은 지우지 않는다 — 다른 글이 같이 쓰고, 자료함 기록(drive_imports)이 그 주소를 가리킨다 (D-081).
 */
export async function removeImages(ctx: AdminContext, urls: Array<string | null | undefined>): Promise<void> {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`;
  // '?v=…' 꼬리(동기화가 붙임)와 해시는 떼고 경로를 낸다
  const paths = bucketPaths(urls, prefix, DRIVE_PREFIX);
  if (paths.length > 0) await ctx.supabase.storage.from(MEDIA_BUCKET).remove(paths);
}

export async function removeImage(ctx: AdminContext, url: string | null | undefined): Promise<void> {
  await removeImages(ctx, [url]);
}
