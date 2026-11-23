// 드라이브 자료함 순수 함수 (D-081) — Drive API v3 응답 해석, 주소 만들기, 안내 문구. Deno/Node 둘 다에서 돈다 (테스트: drive-library.test.ts)

export const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
export const FOLDER_MIME = "application/vnd.google-apps.folder";
/** 사진 긴 변 (썸네일 서비스 =s1600) */
export const IMPORT_LONG_SIDE = 1600;
/** 저장소(media 버킷) 한도와 같게 */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
/** 한 번에 가져오는 파일 수 (구단소식 사진 최대 장수와 같게) */
export const MAX_IMPORT_FILES = 20;
/** 하위 폴더가 루트 안인지 올라가며 볼 최대 깊이 */
export const MAX_DEPTH = 8;

export const ID_RE = /^[A-Za-z0-9_-]{10,100}$/;

export const MSG = {
  noKey: "드라이브 API 키가 없습니다 (GOOGLE_DRIVE_API_KEY 미설정). 최고 관리자가 Supabase 함수 비밀값에 넣어야 합니다.",
  noFolder: "드라이브 폴더가 연결되지 않았습니다. 관리자 > 설정에서 연결하세요.",
  forbidden: "드라이브 자료함을 쓸 권한이 없습니다.",
  notShared: "폴더나 파일을 열 수 없습니다. 드라이브에서 '링크가 있는 모든 사용자'로 공유했는지 확인하세요.",
  outside: "연결한 드라이브 폴더 밖의 항목입니다.",
  badKey: "드라이브 API 키가 올바르지 않거나 Drive API 가 켜져 있지 않습니다. 최고 관리자에게 알려 주세요.",
  quota: "드라이브 요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.",
  failed: "드라이브를 읽지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
  badRequest: "요청이 올바르지 않습니다.",
  notImage: "사진이나 영상만 가져올 수 있습니다.",
  tooBig: "사진이 5MB 를 넘어 가져올 수 없습니다.",
  uploadFailed: "사진을 저장소에 올리지 못했습니다. 다시 시도해 주세요.",
} as const;

/** 관리자 화면에 들어올 수 있는 등급 (최고 관리자/관리자/미디어 — 기존 관리자 등급 규칙) */
export const STAFF = ["owner", "admin", "media"] as const;
export const PURPOSES = ["library", "news", "players", "video", "crest"] as const;
export type Purpose = (typeof PURPOSES)[number];

export type ItemKind = "folder" | "image" | "video" | "other";

/** 화면에 보낼 항목 하나 */
export type DriveItem = {
  id: string;
  name: string;
  kind: ItemKind;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  thumbnail: string | null;
};

/** files.list / files.get 응답의 파일 한 개 (필요한 칸만) */
export type RawFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  parents?: string[];
};

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function kindOf(mimeType: string): ItemKind {
  if (mimeType === FOLDER_MIME) return "folder";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "other";
}

/** 썸네일 주소의 크기 꼬리(=s220 등)를 바꾼다. 꼬리가 없으면 붙인다 */
export function sizedThumb(link: string, side: number): string {
  return /=s\d+(-[a-z0-9-]+)?$/i.test(link) ? link.replace(/=s\d+(-[a-z0-9-]+)?$/i, `=s${side}`) : `${link}=s${side}`;
}

export function toItem(f: RawFile): DriveItem | null {
  if (!f.id || !ID_RE.test(f.id) || !f.mimeType) return null;
  const kind = kindOf(f.mimeType);
  const size = f.size !== undefined && /^\d+$/.test(f.size) ? Number(f.size) : null;
  return {
    id: f.id,
    name: f.name ?? "",
    kind,
    mimeType: f.mimeType,
    size,
    modifiedTime: f.modifiedTime ?? null,
    thumbnail: kind !== "folder" && f.thumbnailLink ? sizedThumb(f.thumbnailLink, 400) : null,
  };
}

/** 폴더 먼저, 그다음 이름순 */
export function sortItems(items: DriveItem[]): DriveItem[] {
  return [...items].sort((a, b) => Number(b.kind === "folder") - Number(a.kind === "folder") || a.name.localeCompare(b.name, "ko"));
}

/** 키는 서버 쪽 query 로만 붙인다 (화면에 나가지 않는다) */
export function listUrl(folderId: string, apiKey: string, pageToken?: string): string {
  const p = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink)",
    pageSize: "100",
    orderBy: "folder, name",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
    key: apiKey,
  });
  if (pageToken) p.set("pageToken", pageToken);
  return `${DRIVE_API}?${p}`;
}

export function getUrl(fileId: string, apiKey: string): string {
  const p = new URLSearchParams({
    fields: "id, name, mimeType, size, modifiedTime, thumbnailLink, parents",
    supportsAllDrives: "true",
    key: apiKey,
  });
  return `${DRIVE_API}/${fileId}?${p}`;
}

export function mediaUrl(fileId: string, apiKey: string): string {
  return `${DRIVE_API}/${fileId}?${new URLSearchParams({ alt: "media", supportsAllDrives: "true", key: apiKey })}`;
}

/** 영상 보기 링크 (D-074 — 영상은 옮기지 않고 링크로 재생) */
export function viewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/** 저장소 경로 — 파일 ID 로 정해서 같은 파일은 한 자리 */
export function storagePath(fileId: string, kind: "image" | "video_cover", contentType: string): string {
  const ext = IMAGE_TYPES[contentType] ?? "jpg";
  return kind === "video_cover" ? `drive/${fileId}-cover.${ext}` : `drive/${fileId}.${ext}`;
}

/** 받은 그림의 형식 — 저장소가 받는 것만 (jpg/png/webp). 그 밖은 null */
export function imageType(contentType: string | null): string | null {
  const t = (contentType ?? "").split(";")[0].trim().toLowerCase();
  return IMAGE_TYPES[t] ? t : null;
}

/** 오류 문구/기록에 섞인 API 키(…?key=값)를 *** 로 (함수 응답, 상태 표, 로그에 키가 남지 않게) */
export function redactKey(text: string): string {
  return text.replace(/([?&]key=)[^&\s)"']*/g, "$1***");
}

/** Drive API 오류 → 안내 문구 */
export function driveError(status: number, body: string): string {
  if (status === 404) return MSG.notShared;
  if (status === 429 || /rateLimitExceeded|userRateLimitExceeded/.test(body)) return MSG.quota;
  if (status === 400 && /API key not valid|keyInvalid/i.test(body)) return MSG.badKey;
  if (status === 403) {
    if (/accessNotConfigured|SERVICE_DISABLED|API_KEY_INVALID|keyInvalid|forbidden.*key/i.test(body)) return MSG.badKey;
    return MSG.notShared;
  }
  return MSG.failed;
}

export type ListRequest = { action: "list"; folderId?: string; pageToken?: string };
export type ImportRequest = { action: "import"; fileIds: string[]; purpose: Purpose };
export type DriveRequest = ListRequest | ImportRequest;

/** 요청 본문 검사 — 틀리면 null */
export function parseRequest(body: unknown): DriveRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.action === "list") {
    const folderId = b.folderId === undefined || b.folderId === null || b.folderId === "" ? undefined : b.folderId;
    if (folderId !== undefined && (typeof folderId !== "string" || !ID_RE.test(folderId))) return null;
    const pageToken = typeof b.pageToken === "string" && b.pageToken.length <= 500 ? b.pageToken : undefined;
    return { action: "list", folderId, pageToken };
  }
  if (b.action === "import") {
    const ids = b.fileIds;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IMPORT_FILES) return null;
    if (!ids.every((id) => typeof id === "string" && ID_RE.test(id))) return null;
    if (typeof b.purpose !== "string" || !(PURPOSES as readonly string[]).includes(b.purpose)) return null;
    return { action: "import", fileIds: [...new Set(ids as string[])], purpose: b.purpose as Purpose };
  }
  return null;
}
