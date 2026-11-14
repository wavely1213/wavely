// 연맹 유튜브 경기 영상 자동 연결 (D-090) — Supabase 예약 실행(pg_cron)이 몇 시간마다 부른다. AI 를 쓰지 않는다.
// 한국풋살연맹 - KFL 공개 RSS(키 없음)에서 우리 경기 영상을 찾아 matches.replay_url / highlight_url 이 비어 있을 때만 넣는다.
// 쓰기는 이 함수 안에서만 서버 키(SUPABASE_SERVICE_ROLE_KEY, Supabase 가 넣어 줌)로 (D-065 와 같음).
// 호출 확인: x-sync-secret 헤더 = Vault 의 kfl_video_sync_secret (DB 함수 kfl_video_sync_secret_ok 로 비교).
import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { FEED_URL, parseFeed, planVideos, seoulDate, type MatchLite } from "./plan.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server not configured" }, 500);
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: ok } = await db.rpc("kfl_video_sync_secret_ok", { p_secret: req.headers.get("x-sync-secret") ?? "" });
  if (ok !== true) return json({ error: "unauthorized" }, 401);

  const started = new Date().toISOString();
  try {
    const res = await fetch(FEED_URL, { headers: { "User-Agent": "eunpyeong-denforce-site/1.0 (kfl-video-sync)" } });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const entries = parseFeed(await res.text());

    // 피드는 최근 15개 — 그 기간 앞뒤 하루를 포함한 경기만 읽는다
    const times = entries.map((e) => Date.parse(e.published)).filter(Number.isFinite);
    const from = new Date(Math.min(...times, Date.now()) - 60 * 86400_000).toISOString();
    const { data: rows, error } = await db
      .from("matches")
      .select("id, kickoff, opponent, highlight_url, replay_url")
      .gte("kickoff", from)
      .order("kickoff");
    if (error) throw new Error(`matches: ${error.message}`);
    const matches: MatchLite[] = (rows ?? []).map((r) => ({
      id: r.id,
      date: seoulDate(r.kickoff),
      opponent: r.opponent,
      highlight_url: r.highlight_url,
      replay_url: r.replay_url,
    }));

    const plan = planVideos(entries, matches);
    const applied: string[] = [];
    for (const u of plan.updates) {
      // 비어 있을 때만 — 그사이 관리자가 넣었으면 0행이 바뀌고 넘어간다
      const { data, error: upErr } = await db.from("matches").update({ [u.field]: u.url }).eq("id", u.matchId).is(u.field, null).select("id");
      if (upErr) plan.notes.push(`넣기 실패 ${u.matchId} ${u.field}: ${upErr.message}`);
      else if (data?.length) applied.push(`${u.matchId} ${u.field} ${u.videoId}`);
    }

    const notes = plan.notes.join("\n").slice(0, 2000) || null;
    await db
      .from("kfl_video_sync_state")
      .update({ last_run_at: started, last_ok_at: new Date().toISOString(), last_error: null, last_applied: applied.join("\n").slice(0, 2000) || null, last_notes: notes })
      .eq("id", 1);
    return json({ ok: true, entries: entries.length, applied, notes: plan.notes });
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e).slice(0, 500);
    await db.from("kfl_video_sync_state").update({ last_run_at: started, last_error: message }).eq("id", 1);
    return json({ ok: false, error: message }, 500);
  }
});
