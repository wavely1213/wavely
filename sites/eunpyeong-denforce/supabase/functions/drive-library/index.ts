// 드라이브 자료함 서버 함수 (D-081) — 관리자 화면이 로그인 토큰을 붙여 부른다 (verify_jwt = true).
// 키: GOOGLE_DRIVE_API_KEY 는 이 함수의 비밀값에만 둔다 (소유자가 Supabase 대시보드에서 넣음). 사이트 코드, Vercel env, DB 에 없다.
// 권한: 부른 사람의 토큰으로 DB 함수 admin_role() 을 불러 최고 관리자/관리자/미디어만 통과 (기존 관리자 등급 규칙).
// 쓰기(저장소 media/drive/…, drive_imports)는 서버 키로만. 자동 게시는 없다 — 저장 주소를 돌려줄 뿐, 글/선수에 넣는 것은 관리자 폼.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { redactKey } from "./drive.ts";
import { handle, type Deps } from "./handler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY") ?? "";
const BUCKET = "media";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) return json({ error: "server not configured" }, 500);
  const auth = req.headers.get("Authorization") ?? "";
  // 부른 사람 권한으로 (RLS, auth.uid())
  const asUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: userData } = await asUser.auth.getUser(auth.replace(/^Bearer\s+/i, ""));

  const deps: Deps = {
    apiKey: API_KEY,
    userId: userData.user?.id ?? null,
    role: async () => {
      if (!userData.user) return null;
      const { data } = await asUser.rpc("admin_role");
      return typeof data === "string" ? data : null;
    },
    rootFolderId: async () => {
      const { data } = await db.from("drive_settings").select("drive_folder_id").eq("id", 1).maybeSingle<{ drive_folder_id: string | null }>();
      return data?.drive_folder_id ?? null;
    },
    fetch: (url) => fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20_000) }),
    findImport: async (fileId) => {
      const { data } = await db.from("drive_imports").select("kind, url, view_url").eq("file_id", fileId).maybeSingle();
      return data ?? null;
    },
    upload: async (path, bytes, contentType) => {
      const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType, cacheControl: "31536000", upsert: false });
      // 이미 있으면(기록 전에 끊긴 경우) 그 파일을 쓴다
      if (error && !/exists|duplicate/i.test(error.message)) return null;
      return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    },
    record: async (row) => {
      const { error } = await db.from("drive_imports").upsert(row, { onConflict: "file_id", ignoreDuplicates: true });
      if (error) throw new Error(`drive_imports: ${error.message}`);
    },
  };

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  try {
    const result = await handle(body, deps);
    return json(result.body, result.status);
  } catch (e) {
    console.error("drive-library", redactKey(String(e instanceof Error ? e.message : e)));
    return json({ error: "드라이브 자료함에서 오류가 났습니다. 잠시 뒤 다시 시도해 주세요." }, 500);
  }
});
