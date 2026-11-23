import assert from "node:assert/strict";
import { test } from "node:test";
import { driveError, MSG, parseRequest, sizedThumb, storagePath, toItem } from "../supabase/functions/drive-library/drive.ts";
import { handle, type Deps, type ImportRecord } from "../supabase/functions/drive-library/handler.ts";

// 드라이브 자료함 (D-081) — 키 없이 가짜 Drive 응답으로

const ROOT = "rootFolder0001";
const SUB = "subFolder00002";
const OTHER = "otherFolder003";
const IMG = "imageFile00004";
const VID = "videoFile00005";
const OUT = "outsideFile006";

type Meta = { id: string; name: string; mimeType: string; parents?: string[]; size?: string; thumbnailLink?: string };
const FILES: Record<string, Meta> = {
  [ROOT]: { id: ROOT, name: "덴포스 자료", mimeType: "application/vnd.google-apps.folder" },
  [SUB]: { id: SUB, name: "경기 사진", mimeType: "application/vnd.google-apps.folder", parents: [ROOT] },
  [OTHER]: { id: OTHER, name: "남의 폴더", mimeType: "application/vnd.google-apps.folder", parents: ["someoneElse01"] },
  someoneElse01: { id: "someoneElse01", name: "x", mimeType: "application/vnd.google-apps.folder" },
  [IMG]: { id: IMG, name: "골.jpg", mimeType: "image/jpeg", parents: [SUB], size: "9000000", thumbnailLink: "https://lh3.example/t/abc=s220" },
  [VID]: { id: VID, name: "릴스.mp4", mimeType: "video/mp4", parents: [ROOT], thumbnailLink: "https://lh3.example/t/vid=s220" },
  [OUT]: { id: OUT, name: "밖.jpg", mimeType: "image/jpeg", parents: [OTHER], thumbnailLink: "https://lh3.example/t/out=s220" },
};

function fakeFetch(opts: { privateRoot?: boolean; badKey?: boolean } = {}) {
  const calls: string[] = [];
  const f = async (url: string): Promise<Response> => {
    calls.push(url);
    if (opts.badKey) return new Response('{"error":{"message":"API key not valid. Please pass a valid API key."}}', { status: 400 });
    if (url.startsWith("https://lh3.example/")) {
      return new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } });
    }
    const u = new URL(url);
    assert.ok(u.searchParams.get("key"), "키는 서버 쪽 query 로 붙는다");
    const m = u.pathname.match(/\/files\/([^/]+)$/);
    if (m) {
      if (opts.privateRoot && m[1] === ROOT) return new Response('{"error":{"code":404}}', { status: 404 });
      const meta = FILES[m[1]];
      return meta ? Response.json(meta) : new Response("{}", { status: 404 });
    }
    const parent = (u.searchParams.get("q") ?? "").match(/'([^']+)' in parents/)?.[1];
    return Response.json({ files: Object.values(FILES).filter((x) => x.parents?.[0] === parent) });
  };
  return { f, calls };
}

function deps(over: Partial<Deps> = {}, fetchOpts = {}) {
  const records: ImportRecord[] = [];
  const uploads: string[] = [];
  const { f, calls } = fakeFetch(fetchOpts);
  const d: Deps = {
    apiKey: "test-key",
    role: async () => "media",
    userId: "user-1",
    rootFolderId: async () => ROOT,
    fetch: f,
    findImport: async () => null,
    upload: async (path) => {
      uploads.push(path);
      return `https://example.supabase.co/storage/v1/object/public/media/${path}`;
    },
    record: async (row) => {
      records.push(row);
    },
    ...over,
  };
  return { d, records, uploads, calls };
}

test("키가 없으면 'GOOGLE_DRIVE_API_KEY 미설정' 안내", async () => {
  const { d } = deps({ apiKey: "" });
  const r = await handle({ action: "list" }, d);
  assert.equal(r.status, 503);
  assert.match((r.body as { error: string }).error, /GOOGLE_DRIVE_API_KEY 미설정/);
});

test("폴더를 연결하지 않았으면 '관리자 > 설정에서 연결하세요'", async () => {
  const { d } = deps({ rootFolderId: async () => null });
  const r = await handle({ action: "list" }, d);
  assert.equal(r.status, 409);
  assert.match((r.body as { error: string }).error, /관리자 > 설정에서 연결하세요/);
});

test("관리자가 아니면 거부 (키, 폴더 상태를 알려 주지 않는다)", async () => {
  for (const role of [null, "visitor"]) {
    const { d, calls } = deps({ role: async () => role, apiKey: "" });
    const r = await handle({ action: "list" }, d);
    assert.equal(r.status, 403);
    assert.equal((r.body as { error: string }).error, MSG.forbidden);
    assert.equal(calls.length, 0);
  }
});

test("공개되지 않은 폴더는 공유 확인 안내", async () => {
  const { d } = deps({}, { privateRoot: true });
  const r = await handle({ action: "list" }, d);
  assert.equal(r.status, 502);
  assert.equal((r.body as { error: string }).error, MSG.notShared);
});

test("키가 틀리면 키 안내", async () => {
  const { d } = deps({}, { badKey: true });
  const r = await handle({ action: "list" }, d);
  assert.equal((r.body as { error: string }).error, MSG.badKey);
});

test("목록: 폴더 먼저, 경로(루트 → 하위), 썸네일 400", async () => {
  const { d } = deps();
  const root = await handle({ action: "list" }, d);
  assert.equal(root.status, 200);
  const b = root.body as { items: Array<{ id: string; kind: string; thumbnail: string | null }>; path: unknown };
  assert.deepEqual(b.items.map((i) => [i.id, i.kind]), [[SUB, "folder"], [VID, "video"]]);
  assert.equal(b.items[1].thumbnail, "https://lh3.example/t/vid=s400");
  const sub = await handle({ action: "list", folderId: SUB }, d);
  assert.deepEqual((sub.body as { path: unknown }).path, [
    { id: ROOT, name: "덴포스 자료" },
    { id: SUB, name: "경기 사진" },
  ]);
});

test("연결한 폴더 밖은 열지 않는다", async () => {
  const { d } = deps();
  const r = await handle({ action: "list", folderId: OTHER }, d);
  assert.equal((r.body as { error: string }).error, MSG.outside);
  const imp = await handle({ action: "import", fileIds: [OUT], purpose: "news" }, d);
  assert.deepEqual((imp.body as { results: unknown[] }).results, [{ id: OUT, error: MSG.outside }]);
});

test("사진 가져오기: 긴 변 1600 썸네일로 media/drive/<id>.jpg, 기록 남김 (원본 9MB 는 받지 않음)", async () => {
  const { d, records, uploads, calls } = deps();
  const r = await handle({ action: "import", fileIds: [IMG], purpose: "news" }, d);
  assert.equal(r.status, 200);
  assert.deepEqual(uploads, [`drive/${IMG}.jpg`]);
  assert.ok(calls.includes("https://lh3.example/t/abc=s1600"));
  assert.ok(!calls.some((c) => c.includes("alt=media")));
  assert.equal(records[0].purpose, "news");
  assert.equal(records[0].imported_by, "user-1");
  assert.deepEqual((r.body as { results: unknown[] }).results, [
    { id: IMG, name: "골.jpg", kind: "image", url: `https://example.supabase.co/storage/v1/object/public/media/drive/${IMG}.jpg` },
  ]);
});

test("이미 가져온 파일은 다시 받지 않는다", async () => {
  const { d, uploads, calls } = deps({ findImport: async () => ({ kind: "image", url: "https://x/media/drive/a.jpg", view_url: null }) });
  const r = await handle({ action: "import", fileIds: [IMG], purpose: "players" }, d);
  assert.equal(uploads.length, 0);
  assert.equal(calls.length, 0);
  assert.deepEqual((r.body as { results: unknown[] }).results, [{ id: IMG, name: "", kind: "image", url: "https://x/media/drive/a.jpg" }]);
});

test("영상: 파일은 옮기지 않고 보기 링크 + 표지만", async () => {
  const { d, uploads, records } = deps();
  const r = await handle({ action: "import", fileIds: [VID], purpose: "video" }, d);
  assert.deepEqual(uploads, [`drive/${VID}-cover.jpg`]);
  assert.equal(records[0].kind, "video_cover");
  const res = (r.body as { results: Array<{ viewUrl: string; kind: string }> }).results[0];
  assert.equal(res.kind, "video");
  assert.equal(res.viewUrl, `https://drive.google.com/file/d/${VID}/view`);
});

test("요청 검사", () => {
  assert.equal(parseRequest(null), null);
  assert.equal(parseRequest({ action: "delete" }), null);
  assert.equal(parseRequest({ action: "list", folderId: "../etc" }), null);
  assert.equal(parseRequest({ action: "import", fileIds: [], purpose: "news" }), null);
  assert.equal(parseRequest({ action: "import", fileIds: [IMG], purpose: "home" }), null);
  assert.deepEqual(parseRequest({ action: "import", fileIds: [IMG, IMG], purpose: "news" }), { action: "import", fileIds: [IMG], purpose: "news" });
});

test("작은 함수들", () => {
  assert.equal(sizedThumb("https://a/b=s220", 1600), "https://a/b=s1600");
  assert.equal(sizedThumb("https://a/b=s220-c", 400), "https://a/b=s400");
  assert.equal(sizedThumb("https://a/b", 400), "https://a/b=s400");
  assert.equal(storagePath(IMG, "image", "image/png"), `drive/${IMG}.png`);
  assert.equal(toItem({ id: "short", mimeType: "image/jpeg" }), null);
  assert.equal(driveError(404, ""), MSG.notShared);
  assert.equal(driveError(429, ""), MSG.quota);
  assert.equal(driveError(403, '{"reason":"accessNotConfigured"}'), MSG.badKey);
});

test("엠블럼(crest)은 투명 바탕을 지키려고 원본(alt=media)을 먼저 받는다 (D-094)", async () => {
  const LOGO = "logoFile00007";
  const { f } = fakeFetch();
  const calls: string[] = [];
  const d = deps({
    fetch: async (url: string) => {
      calls.push(url);
      if (url.includes(`/files/${LOGO}?`) && url.includes("alt=media")) return new Response(new Uint8Array([9, 9]), { headers: { "content-type": "image/png" } });
      if (url.includes(`/files/${LOGO}?`)) return Response.json({ id: LOGO, name: "제천FS.png", mimeType: "image/png", parents: [ROOT], size: "40000", thumbnailLink: "https://lh3.example/t/logo=s220" });
      return f(url);
    },
  });
  const r = await handle({ action: "import", fileIds: [LOGO], purpose: "crest" }, d.d);
  assert.deepEqual((r.body as { results: Array<{ url: string }> }).results.map((x) => x.url.split("/").pop()), [`${LOGO}.png`]);
  assert.ok(calls.some((c) => c.includes("alt=media")));
  assert.ok(!calls.some((c) => c.includes("=s1600")));
});
