// 드라이브 자료함 (D-081) — 관리자 화면 쪽 순수 함수와 형식. 서버 함수 drive-library 와 주고받는 모양은 supabase/functions/drive-library 와 같게.
// 테스트: tests/drive.test.ts

const ID = /^[A-Za-z0-9_-]{10,100}$/;

/**
 * 드라이브 폴더 링크 → 폴더 ID. 받는 모양:
 *   https://drive.google.com/drive/folders/<id>(?usp=sharing)
 *   https://drive.google.com/drive/u/0/folders/<id>
 *   https://drive.google.com/open?id=<id>
 *   <id> 만
 * 그 밖은 null
 */
export function folderIdFromLink(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  if (ID.test(v)) return v;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== "drive.google.com") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("folders");
  const id = i >= 0 ? parts[i + 1] : u.pathname === "/open" ? u.searchParams.get("id") : null;
  return id && ID.test(id) ? id : null;
}

export function folderLink(id: string): string {
  return `https://drive.google.com/drive/folders/${id}`;
}

/** 저장소(media 버킷) 안 드라이브 가져오기 자리 — 폼이 받는 '<칸>_drive' 값은 이 아래 주소만 믿는다 */
export function driveImportPrefix(supabaseUrl: string, bucket: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/drive/`;
}

export function isDriveImportUrl(url: string | null | undefined, prefix: string): url is string {
  if (!url || !url.startsWith(prefix)) return false;
  return /^[A-Za-z0-9_-]{10,100}(-cover)?\.(jpg|png|webp)$/.test(url.slice(prefix.length));
}

export type DriveItemKind = "folder" | "image" | "video" | "other";
export type DriveItem = {
  id: string;
  name: string;
  kind: DriveItemKind;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  thumbnail: string | null;
};
export type DriveListing = {
  folder: { id: string; name: string };
  path: Array<{ id: string; name: string }>;
  items: DriveItem[];
  nextPageToken: string | null;
};
export type DrivePurpose = "library" | "news" | "players" | "video" | "crest";
export type DriveImportResult =
  | { id: string; name: string; kind: "image"; url: string }
  | { id: string; name: string; kind: "video"; url: string | null; viewUrl: string }
  | { id: string; error: string };

/** 서버 액션이 화면에 돌려주는 모양 */
export type DriveResponse<T> = { ok: true; data: T } | { ok: false; error: string };

/** 크기 표시 (KB/MB) */
export function formatBytes(n: number | null): string {
  if (n === null) return "";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}
