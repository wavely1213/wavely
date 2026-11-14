// 드라이브 자료함 요청 처리 (D-081) — 바깥(DB, 저장소, fetch, 키)은 deps 로 받아 테스트에서 가짜로 바꾼다.
import {
  driveError,
  getUrl,
  imageType,
  IMPORT_LONG_SIDE,
  kindOf,
  listUrl,
  MAX_DEPTH,
  MAX_IMPORT_BYTES,
  mediaUrl,
  MSG,
  parseRequest,
  sizedThumb,
  sortItems,
  STAFF,
  storagePath,
  toItem,
  viewUrl,
  type DriveItem,
  type Purpose,
  type RawFile,
} from "./drive.ts";

export type ImportRecord = {
  file_id: string;
  kind: "image" | "video_cover";
  purpose: Purpose;
  file_name: string;
  url: string;
  view_url: string | null;
  imported_by: string | null;
};

export type Deps = {
  /** Edge Function 비밀값 GOOGLE_DRIVE_API_KEY (없으면 빈 글자) */
  apiKey: string;
  /** 호출한 사람의 관리자 등급 (관리자가 아니면 null) */
  role: () => Promise<string | null>;
  userId: string | null;
  /** 관리자 › 설정에 저장한 루트 폴더 ID */
  rootFolderId: () => Promise<string | null>;
  fetch: (url: string) => Promise<Response>;
  findImport: (fileId: string) => Promise<Pick<ImportRecord, "kind" | "url" | "view_url"> | null>;
  /** 저장소에 올리고 공개 주소를 돌려준다. 이미 있으면 그 주소, 실패하면 null */
  upload: (path: string, bytes: Uint8Array, contentType: string) => Promise<string | null>;
  record: (row: ImportRecord) => Promise<void>;
};

export type Result = { status: number; body: unknown };

export type ImportResult =
  | { id: string; name: string; kind: "image"; url: string }
  | { id: string; name: string; kind: "video"; url: string | null; viewUrl: string }
  | { id: string; error: string };

class DriveFail extends Error {}

const fail = (status: number, message: string): Result => ({ status, body: { error: message } });

export async function handle(body: unknown, deps: Deps): Promise<Result> {
  const role = await deps.role();
  if (!role || !(STAFF as readonly string[]).includes(role)) return fail(403, MSG.forbidden);
  if (!deps.apiKey) return fail(503, MSG.noKey);
  const root = await deps.rootFolderId();
  if (!root) return fail(409, MSG.noFolder);
  const req = parseRequest(body);
  if (!req) return fail(400, MSG.badRequest);

  const api = new DriveApi(deps, root);
  try {
    if (req.action === "list") return { status: 200, body: await api.list(req.folderId ?? root, req.pageToken) };
    const results: ImportResult[] = [];
    for (const id of req.fileIds) results.push(await importOne(api, deps, id, req.purpose));
    return { status: 200, body: { results } };
  } catch (e) {
    if (e instanceof DriveFail) return fail(502, e.message);
    throw e;
  }
}

class DriveApi {
  deps: Deps;
  root: string;
  constructor(deps: Deps, root: string) {
    this.deps = deps;
    this.root = root;
  }

  async json<T>(url: string): Promise<T> {
    const res = await this.deps.fetch(url);
    if (!res.ok) throw new DriveFail(driveError(res.status, await res.text().catch(() => "")));
    return (await res.json()) as T;
  }

  get(id: string): Promise<RawFile> {
    return this.json<RawFile>(getUrl(id, this.deps.apiKey));
  }

  /**
   * 루트에서 이 항목까지의 폴더 줄 (루트 → … → 항목). 루트 밖이면 DriveFail(outside).
   * 루트 자신도 files.get 으로 열어 본다 — 공개되지 않은 폴더는 여기서 '공유 확인' 안내가 된다.
   */
  async trail(id: string, self?: RawFile): Promise<Array<{ id: string; name: string }>> {
    const chain: Array<{ id: string; name: string }> = [];
    let cur = self ?? (await this.get(id));
    for (let depth = 0; depth <= MAX_DEPTH; depth++) {
      chain.unshift({ id: cur.id ?? id, name: cur.name ?? "" });
      if (cur.id === this.root) return chain;
      const parent = cur.parents?.[0];
      if (!parent) break;
      cur = await this.get(parent);
    }
    throw new DriveFail(MSG.outside);
  }

  async list(folderId: string, pageToken?: string) {
    const folder = await this.get(folderId);
    if (kindOf(folder.mimeType ?? "") !== "folder") throw new DriveFail(MSG.badRequest);
    const path = await this.trail(folderId, folder);
    const page = await this.json<{ files?: RawFile[]; nextPageToken?: string }>(listUrl(folderId, this.deps.apiKey, pageToken));
    const items = sortItems((page.files ?? []).map(toItem).filter((x): x is DriveItem => x !== null));
    return { folder: { id: folderId, name: folder.name ?? "" }, path, items, nextPageToken: page.nextPageToken ?? null };
  }

  /** 그림 받기 — 성공하면 [바이트, 형식], 아니면 null */
  async image(url: string): Promise<[Uint8Array, string] | null> {
    const res = await this.deps.fetch(url);
    if (!res.ok) return null;
    const type = imageType(res.headers.get("content-type"));
    if (!type) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMPORT_BYTES) return null;
    return [bytes, type];
  }
}

async function importOne(api: DriveApi, deps: Deps, id: string, purpose: Purpose): Promise<ImportResult> {
  // 이미 가져온 파일은 다시 받지 않는다 (file id 로)
  const done = await deps.findImport(id);
  if (done) {
    return done.kind === "video_cover" || done.view_url
      ? { id, name: "", kind: "video", url: done.url || null, viewUrl: done.view_url ?? viewUrl(id) }
      : { id, name: "", kind: "image", url: done.url };
  }

  let file: RawFile;
  try {
    file = await api.get(id);
    await api.trail(id, file);
  } catch (e) {
    if (e instanceof DriveFail) return { id, error: e.message };
    throw e;
  }
  const name = file.name ?? "";
  const kind = kindOf(file.mimeType ?? "");
  const thumb = file.thumbnailLink ? sizedThumb(file.thumbnailLink, IMPORT_LONG_SIDE) : null;

  if (kind === "video") {
    // 영상 파일은 옮기지 않는다 — 보기 링크 + 표지(썸네일)만
    const cover = thumb ? await api.image(thumb) : null;
    let url: string | null = null;
    if (cover) {
      url = await deps.upload(storagePath(id, "video_cover", cover[1]), cover[0], cover[1]);
      if (!url) return { id, error: MSG.uploadFailed };
    }
    await deps.record({ file_id: id, kind: "video_cover", purpose, file_name: name, url: url ?? "", view_url: viewUrl(id), imported_by: deps.userId });
    return { id, name, kind: "video", url, viewUrl: viewUrl(id) };
  }

  if (kind !== "image") return { id, error: MSG.notImage };
  const size = file.size !== undefined ? Number(file.size) : NaN;
  const originalOk = imageType(file.mimeType ?? "") !== null && !(Number.isFinite(size) && size > MAX_IMPORT_BYTES);
  // 엠블럼은 투명 바탕을 지켜야 해서 원본(PNG/WebP) 먼저 — 썸네일은 JPG 로 바뀔 수 있다 (D-094)
  // 그 밖의 사진은 긴 변 약 1600 썸네일을 먼저 (무료 요금제 용량에 맞게 작게), 안 되면 원본(5MB 이하, jpg/png/webp)
  let got: [Uint8Array, string] | null = null;
  if (purpose === "crest" && originalOk) got = await api.image(mediaUrl(id, deps.apiKey));
  if (!got && thumb) got = await api.image(thumb);
  if (!got) {
    if (Number.isFinite(size) && size > MAX_IMPORT_BYTES) return { id, error: MSG.tooBig };
    if (!imageType(file.mimeType ?? "")) return { id, error: MSG.notImage };
    got = await api.image(mediaUrl(id, deps.apiKey));
  }
  if (!got) return { id, error: MSG.failed };
  const url = await deps.upload(storagePath(id, "image", got[1]), got[0], got[1]);
  if (!url) return { id, error: MSG.uploadFailed };
  await deps.record({ file_id: id, kind: "image", purpose, file_name: name, url, view_url: null, imported_by: deps.userId });
  return { id, name, kind: "image", url };
}
