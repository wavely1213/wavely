// 매치데이 포스터 자동 연결 (D-096) — Supabase 예약 실행(pg_cron)이 15분마다 부른다. AI 를 쓰지 않는다.
// 구단 드라이브 포스터 폴더(관리자 › 설정 matchday_folder_id)의 날짜 폴더에서 MATCH DAY / FULL TIME 이미지를 찾아
// 웹용(긴 변 1600, 드라이브 썸네일 JPEG)으로 저장소 media/matchday/ 에 두고 matches 의 빈 칸에만 넣는다.
// 키: 함수 비밀값 GOOGLE_DRIVE_API_KEY (D-081 과 같음). 없으면 '키 필요' 상태만 남긴다(드라이브 웹 페이지를 긁지 않음).
// 쓰기는 이 함수 안에서만 서버 키로 (D-065 와 같음). 호출 확인: x-sync-secret = Vault matchday_poster_sync_secret.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { driveError, FOLDER_MIME, listUrl } from "../drive-library/drive.ts";
import {
  appliedKey,
  matchForFolder,
  needsPoster,
  parseFolderName,
  planFolder,
  shouldRun,
  storagePath,
  type DriveFile,
  type PosterMatch,
  type PosterUpdate,
} from "./plan.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY") ?? "";
const BUCKET = "media";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PAGES = 5;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** 폴더 안 항목 전부 (쪽 넘김) */
async function listAll(folderId: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let token: string | undefined;
  for (let i = 0; i < MAX_PAGES; i++) {
    const res = await fetch(listUrl(folderId, API_KEY, token));
    if (!res.ok) throw new Error(driveError(res.status, await res.text().catch(() => "")));
    const page = (await res.json()) as { files?: DriveFile[]; nextPageToken?: string };
    out.push(...(page.files ?? []).filter((f) => f.id && f.name && f.mimeType));
    token = page.nextPageToken;
    if (!token) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server not configured" }, 500);
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const secret = req.headers.get("x-sync-secret") ?? "";
  if (!/^[0-9a-f]{64}$/.test(secret)) return json({ error: "unauthorized" }, 401);
  const { data: ok } = await db.rpc("matchday_poster_sync_secret_ok", { p_secret: secret });
  if (ok !== true) return json({ error: "unauthorized" }, 401);

  const now = Date.now();
  const started = new Date(now).toISOString();
  const setState = (values: Record<string, unknown>) => db.from("matchday_poster_sync_state").update({ last_run_at: started, ...values }).eq("id", 1);
  try {
    const { data: rows, error } = await db
      .from("matches")
      .select("id, kickoff, opponent, matchday_poster_url, fulltime_poster_url")
      .gte("kickoff", new Date(now - 86400_000).toISOString())
      .lte("kickoff", new Date(now + 60 * 86400_000).toISOString())
      .order("kickoff");
    if (error) throw new Error(`matches: ${error.message}`);
    const matches = (rows ?? []) as PosterMatch[];

    const { data: st } = await db.from("matchday_poster_sync_state").select("last_ok_at").eq("id", 1).maybeSingle<{ last_ok_at: string | null }>();
    if (!shouldRun(now, matches.map((m) => m.kickoff), st?.last_ok_at ?? null)) return json({ ok: true, skipped: true });

    if (!API_KEY) {
      await setState({ last_status: "no_key", last_error: "GOOGLE_DRIVE_API_KEY 없음 (Supabase 함수 비밀값)" });
      return json({ ok: false, status: "no_key" });
    }
    const { data: cs } = await db.from("club_settings").select("matchday_folder_id").eq("id", 1).maybeSingle<{ matchday_folder_id: string | null }>();
    const root = cs?.matchday_folder_id ?? null;
    if (!root) {
      await setState({ last_status: "no_folder", last_error: "포스터 폴더가 설정되지 않음 (관리자 › 설정)" });
      return json({ ok: false, status: "no_folder" });
    }

    const { data: done, error: doneErr } = await db.from("matchday_poster_sync_applied").select("match_id, field");
    if (doneErr) throw new Error(`applied: ${doneErr.message}`);
    const applied = new Set((done ?? []).map((d) => appliedKey(d.match_id, d.field)));

    const notes: string[] = [];
    const updates: PosterUpdate[] = [];
    for (const folder of (await listAll(root)).filter((f) => f.mimeType === FOLDER_MIME)) {
      const name = parseFolderName(folder.name);
      if (!name) continue;
      const match = matchForFolder(name, matches, now);
      if (typeof match === "string") continue; // 지난 시즌/먼 경기 폴더는 조용히 넘어간다
      if (!needsPoster(match, applied)) continue;
      const plan = planFolder(match, await listAll(folder.id), applied);
      updates.push(...plan.updates);
      notes.push(...plan.notes);
    }

    const appliedList: string[] = [];
    for (const u of updates) {
      const img = await fetch(u.thumb, { redirect: "follow" });
      const type = (img.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!img.ok || !/^image\/(jpeg|png|webp)$/.test(type)) {
        notes.push(`${u.fileName}: 이미지를 받지 못함 (${img.status})`);
        continue;
      }
      const bytes = new Uint8Array(await img.arrayBuffer());
      if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) {
        notes.push(`${u.fileName}: 크기 이상 (${bytes.byteLength})`);
        continue;
      }
      const path = storagePath(u.matchId, u.field);
      const { error: upErr } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: type, cacheControl: "300", upsert: true });
      if (upErr) {
        notes.push(`${u.fileName}: 저장 실패 ${upErr.message}`);
        continue;
      }
      // 같은 경로를 다시 쓸 수 있어 주소 꼬리에 파일 ID 를 붙여 캐시를 갈라 둔다
      const url = `${db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}?v=${u.fileId}`;
      // 비어 있을 때만 — 그사이 관리자가 넣었으면 0행이 바뀌고 넘어간다
      const { data: set, error: setErr } = await db.from("matches").update({ [u.field]: url }).eq("id", u.matchId).is(u.field, null).select("id");
      if (setErr) notes.push(`넣기 실패 ${u.matchId} ${u.field}: ${setErr.message}`);
      else if (set?.length) {
        appliedList.push(`${u.matchId} ${u.field} ${u.fileName}`);
        const { error: logErr } = await db
          .from("matchday_poster_sync_applied")
          .upsert({ match_id: u.matchId, field: u.field, file_id: u.fileId, applied_at: new Date().toISOString() }, { onConflict: "match_id,field" });
        if (logErr) notes.push(`기록 실패 ${u.matchId} ${u.field}: ${logErr.message}`);
      }
    }

    await setState({
      last_ok_at: new Date().toISOString(),
      last_status: "ok",
      last_error: null,
      last_applied: appliedList.join("\n").slice(0, 2000) || null,
      last_notes: notes.join("\n").slice(0, 2000) || null,
    });
    return json({ ok: true, applied: appliedList, notes });
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e).slice(0, 500);
    await setState({ last_status: "error", last_error: message });
    return json({ ok: false, error: message }, 500);
  }
});
