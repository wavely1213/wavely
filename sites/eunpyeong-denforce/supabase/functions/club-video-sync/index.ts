// 구단 유튜브 롱폼 → 구단영상 자동 반영 (D-101) — Supabase 예약 실행(pg_cron)이 3시간마다 부른다. AI 를 쓰지 않는다.
// '덴포스 DENFORCE SPORTS' 롱폼 중 제목에 '은평'이 든 영상을 news_posts(category 'video')에 넣는다. 누르면 유튜브 원본 새 창(D-074).
// 키: 함수 비밀값 GOOGLE_DRIVE_API_KEY (kfl-video-sync 와 같은 키, YouTube Data API v3). 없으면 상태만 남긴다.
// 쓰기는 이 함수 안에서만 서버 키로 (D-065 와 같음). 호출 확인: x-sync-secret = Vault club_video_sync_secret.
// kfl-video-sync 와 따로 둔 이유: 쓰는 곳(matches 칸 vs news_posts 글), 기록 표, 실패가 서로 막지 않게. 유튜브 순수 함수만 같이 쓴다.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { redactKey } from "../drive-library/drive.ts";
import {
  appliedForPlan,
  LONGFORM_PLAYLIST,
  longformUnavailable,
  MAX_SHORTS_CHECKS,
  parseClubPlaylist,
  planClubVideos,
  playlistUrl,
  shortsFromStatus,
  shortsUrl,
  UPLOADS_PLAYLIST,
  youtubeError,
  videoIdsOf,
  videoUrlFilter,
  youtubeIdOf,
  type AppliedRow,
  type ClubVideo,
} from "./plan.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY") ?? "";
/** 최근 50개씩 2쪽 (100개) — 3시간마다 도니 충분 */
const MAX_PAGES = 2;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

class LongformMissing extends Error {}

async function readPlaylist(playlistId: string): Promise<ClubVideo[]> {
  const videos: ClubVideo[] = [];
  let token: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(playlistUrl(playlistId, API_KEY, token), { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (playlistId === LONGFORM_PLAYLIST && page === 0 && longformUnavailable(res.status, body)) throw new LongformMissing();
      throw new Error(youtubeError(res.status, body));
    }
    const data = parseClubPlaylist(await res.json());
    videos.push(...data.videos);
    if (!data.nextPageToken) break;
    token = data.nextPageToken;
  }
  return videos;
}

/** 쇼츠 확인 — 리다이렉트를 따라가지 않는다. 실패는 null(모름) */
async function checkShorts(videoId: string): Promise<boolean | null> {
  try {
    const res = await fetch(shortsUrl(videoId), { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(10_000) });
    await res.body?.cancel().catch(() => {});
    return shortsFromStatus(res.status);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server not configured" }, 500);
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const secret = req.headers.get("x-sync-secret") ?? "";
  if (!/^[0-9a-f]{64}$/.test(secret)) return json({ error: "unauthorized" }, 401);
  const { data: ok } = await db.rpc("club_video_sync_secret_ok", { p_secret: secret });
  if (ok !== true) return json({ error: "unauthorized" }, 401);

  const started = new Date().toISOString();
  const setState = (values: Record<string, unknown>) => db.from("club_video_sync_state").update({ last_run_at: started, ...values }).eq("id", 1);
  try {
    if (!API_KEY) {
      await setState({ last_error: "키 필요 — GOOGLE_DRIVE_API_KEY (YouTube Data API v3 켜기)" });
      return json({ ok: false, status: "no_key" });
    }

    // 롱폼 목록 먼저, 안 되면 업로드 전체 + 쇼츠 확인
    let source: "longform" | "uploads" = "longform";
    let videos: ClubVideo[];
    try {
      videos = await readPlaylist(LONGFORM_PLAYLIST);
    } catch (e) {
      if (!(e instanceof LongformMissing)) throw e;
      source = "uploads";
      videos = await readPlaylist(UPLOADS_PLAYLIST);
    }

    // 이번 실행 영상만 읽는다 (전체를 읽으면 PostgREST 1000줄 상한에 잘려 지운 글/쇼츠 기록이 빠질 수 있음)
    const ids = videoIdsOf(videos);
    const { data: done, error: doneErr } = ids.length
      ? await db.from("club_video_sync_applied").select("video_id, kind").in("video_id", ids)
      : { data: [], error: null };
    if (doneErr) throw new Error(`applied: ${doneErr.message}`);
    const applied = appliedForPlan((done ?? []) as AppliedRow[], source);

    // 사이트에 이미 있는 이 영상들의 글 (관리자가 손으로 넣은 것 포함)
    const { data: posts, error: postsErr } = ids.length
      ? await db.from("news_posts").select("id, video_url").or(videoUrlFilter(ids))
      : { data: [], error: null };
    if (postsErr) throw new Error(`news_posts: ${postsErr.message}`);
    const existing = new Map<string, string>();
    for (const p of posts ?? []) {
      const id = youtubeIdOf(p.video_url as string);
      if (id && !existing.has(id)) existing.set(id, p.id as string);
    }

    let plan = planClubVideos({ videos, applied, existing, fromUploads: source === "uploads" });
    if (plan.needShortsCheck.length) {
      const shorts = new Map<string, boolean | null>();
      for (const v of plan.needShortsCheck.slice(0, MAX_SHORTS_CHECKS)) shorts.set(v.videoId, await checkShorts(v.videoId));
      plan = planClubVideos({ videos, applied, existing, fromUploads: true, shorts });
      if (plan.needShortsCheck.length) plan.notes.push(`쇼츠 확인을 다음 실행으로 미룬 영상 ${plan.needShortsCheck.length}개`);
    }

    const appliedList: string[] = [];
    for (const r of plan.record) {
      const { error } = await db
        .from("club_video_sync_applied")
        .upsert({ video_id: r.video.videoId, kind: "existing", news_id: r.newsId, title: r.video.title.slice(0, 200) }, { onConflict: "video_id" });
      if (error) plan.notes.push(`기록 실패 ${r.video.videoId}: ${error.message}`);
    }
    // 쇼츠 판정은 기록해 다음 실행에서 다시 확인하지 않는다 (확인 슬롯을 오래된 쇼츠가 계속 차지하지 않게)
    for (const v of plan.shorts) {
      const { error } = await db.from("club_video_sync_applied").upsert({ video_id: v.videoId, kind: "short", news_id: null, title: v.title.slice(0, 200) }, { onConflict: "video_id" });
      if (error) plan.notes.push(`기록 실패 ${v.videoId}: ${error.message}`);
    }
    for (const { video, draft } of plan.inserts) {
      // 그사이 같은 영상 글이 생겼으면(관리자, 다른 실행) 넣지 않는다
      const { data: dup } = await db.from("news_posts").select("id").ilike("video_url", `%${video.videoId}%`).limit(1);
      if (dup?.length) {
        await db.from("club_video_sync_applied").upsert({ video_id: video.videoId, kind: "existing", news_id: dup[0].id, title: video.title.slice(0, 200) }, { onConflict: "video_id" });
        continue;
      }
      const { data: row, error } = await db.from("news_posts").insert(draft).select("id").single();
      if (error || !row) {
        plan.notes.push(`넣기 실패 ${video.videoId}: ${error?.message ?? "행 없음"}`);
        continue;
      }
      appliedList.push(`${draft.date} ${draft.title}`);
      const { error: logErr } = await db
        .from("club_video_sync_applied")
        .upsert({ video_id: video.videoId, kind: "inserted", news_id: row.id, title: video.title.slice(0, 200), applied_at: new Date().toISOString() }, { onConflict: "video_id" });
      if (logErr) plan.notes.push(`기록 실패 ${video.videoId}: ${logErr.message}`);
    }

    await setState({
      last_ok_at: new Date().toISOString(),
      last_error: null,
      last_source: source,
      last_applied: appliedList.join("\n").slice(0, 2000) || null,
      last_notes: plan.notes.join("\n").slice(0, 2000) || null,
    });
    return json({ ok: true, source, videos: videos.length, applied: appliedList, notes: plan.notes });
  } catch (e) {
    // 바깥 요청 오류 문구에 주소(…?key=)가 섞일 수 있어 키를 가린다
    const message = redactKey(String(e instanceof Error ? e.message : e)).slice(0, 500);
    await setState({ last_error: message });
    return json({ ok: false, error: message }, 500);
  }
});
