// RLS 검증: anon / 비관리자 로그인 / 관리자 로그인 각각의 읽기·쓰기 권한
// 로컬 Supabase 전용 (운영 DB 에 실행 금지 — 테스트 행을 쓰고 지운다).
// 준비: npx supabase start → 마이그레이션·seed 적용 → 테스트 계정 2개 생성
//   admin@test.local / Admin1234! (admins 에 추가), user@test.local / User12345! (추가 안 함)
// 실행: SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_KEY=<로컬 publishable key> node supabase/tests/rls-check.mjs
import { createClient } from "@supabase/supabase-js";
const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY = process.env.SUPABASE_KEY;
if (!URL.includes("127.0.0.1") && !URL.includes("localhost")) throw new Error("로컬 Supabase 에서만 실행하세요");
if (!KEY) throw new Error("SUPABASE_KEY 가 필요합니다");
const mk = () => createClient(URL, KEY, { auth: { persistSession: false } });
let fail = 0;
const check = (label, cond) => { console.log(cond ? "PASS" : "FAIL", label); if (!cond) fail++; };

const tables = { sponsors: { name: "rls", tier: "partner" }, players: { slug: "rls-x", name: "rls", position: "GK" }, matches: { competition: "c", kickoff: "2026-01-01T00:00:00Z", opponent: "o" }, standings: { season: "rls", team: "rls" }, news_posts: { category: "notice", title: "rls" }, staff: { role: "r", name: "n" }, history_items: { year: "1", text: "t" }, postings: { kind: "fan", platform: "web", title: "rls", url: "https://example.com/rls", posted_on: "2026-01-01" } };

async function writes(c, who, expectOk) {
  for (const [t, row] of Object.entries(tables)) {
    const ins = await c.from(t).insert(row).select("id");
    const ok = !ins.error && ins.data?.length === 1;
    check(`${who} insert ${t} → ${expectOk ? "허용" : "거부"}`, ok === expectOk);
    if (ok) { const del = await c.from(t).delete().eq("id", ins.data[0].id).select("id"); check(`${who} delete ${t}`, del.data?.length === 1); }
  }
  const upd = await c.from("club_settings").update({ contact_phone: "000" }).eq("id", 1).select("id");
  check(`${who} update club_settings → ${expectOk ? "허용" : "거부"}`, (upd.data?.length === 1) === expectOk);
  if (expectOk) await c.from("club_settings").update({ contact_phone: null }).eq("id", 1);
  const delSettings = await c.from("club_settings").delete().eq("id", 1).select("id");
  check(`${who} delete club_settings → 항상 거부`, !delSettings.data?.length);
  const up = await c.storage.from("media").upload(`rls/${who}-${Date.now()}.png`, new Blob([new Uint8Array([137,80,78,71])], { type: "image/png" }), { contentType: "image/png" });
  check(`${who} storage upload → ${expectOk ? "허용" : "거부"}`, !up.error === expectOk);
  if (!up.error) { const rm = await c.storage.from("media").remove([up.data.path]); check(`${who} storage remove`, rm.data?.length === 1); }
  const adm = await c.from("admins").select("email");
  check(`${who} admins 목록 조회 → ${expectOk ? "보임" : "안 보임"}`, ((adm.data?.length ?? 0) > 0) === expectOk);
  const ins = await c.from("admins").insert({ email: "evil@x.com" });
  check(`${who} admins 추가 → 항상 거부`, Boolean(ins.error));
}

// 1) anon
const anon = mk();
const pub = await anon.from("players").select("id");
check("anon 공개 조회 가능", !pub.error && pub.data.length > 0);
await writes(anon, "anon", false);
// 비공개 글은 anon 에게 안 보임
const admin = mk();
await admin.auth.signInWithPassword({ email: "admin@test.local", password: "Admin1234!" });
const hidden = await admin.from("news_posts").insert({ category: "notice", title: "비공개 테스트", published: false }).select("id").single();
const anonSee = await anon.from("news_posts").select("id").eq("id", hidden.data.id);
check("anon 에게 비공개 글 안 보임", anonSee.data?.length === 0);
const adminSee = await admin.from("news_posts").select("id").eq("id", hidden.data.id);
check("관리자에게 비공개 글 보임", adminSee.data?.length === 1);
await admin.from("news_posts").delete().eq("id", hidden.data.id);
const hiddenPosting = await admin.from("postings").insert({ kind: "fan", platform: "web", title: "비공개 테스트", url: "https://example.com/rls-hidden", posted_on: "2026-01-01", published: false }).select("id").single();
check("anon 에게 비공개 포스팅 안 보임", (await anon.from("postings").select("id").eq("id", hiddenPosting.data.id)).data?.length === 0);
check("관리자에게 비공개 포스팅 보임", (await admin.from("postings").select("id").eq("id", hiddenPosting.data.id)).data?.length === 1);
await admin.from("postings").delete().eq("id", hiddenPosting.data.id);
// 2) 로그인했지만 관리자 아님
const user = mk();
const si = await user.auth.signInWithPassword({ email: "user@test.local", password: "User12345!" });
check("비관리자 로그인 자체는 성공", !si.error);
const isAdm = await user.rpc("is_admin");
check("비관리자 is_admin() = false", isAdm.data === false);
await writes(user, "user", false);
// 3) 관리자
check("관리자 is_admin() = true", (await admin.rpc("is_admin")).data === true);
await writes(admin, "admin", true);
// 4) 감사 기록: updated_by
const s = await admin.from("sponsors").insert({ name: "audit", tier: "partner" }).select("updated_by, id").single();
// 이메일 대신 로그인 계정 ID (I-042)
check("updated_by 에 관리자 로그인 계정 ID 기록 (이메일 아님)", s.data?.updated_by === (await admin.auth.getUser()).data.user?.id && !s.data?.updated_by?.includes("@"));
await admin.from("sponsors").delete().eq("id", s.data.id);
// 5) 제약: 종료 경기 스코어 필수
const bad = await admin.from("matches").insert({ competition: "c", kickoff: "2026-01-01T00:00:00Z", opponent: "o", status: "finished" });
check("종료 경기 스코어 없으면 DB 가 거부", bad.error?.code === "23514");
// 6) 제약: 경기 영상 주소는 https 만 (20261018100000)
const badVideo = await admin.from("matches").insert({ competition: "c", kickoff: "2026-01-01T00:00:00Z", opponent: "o", highlight_url: "http://example.com/v" });
check("경기 영상 주소가 https 가 아니면 DB 가 거부", badVideo.error?.code === "23514");
// 6-1) 매치데이 포스터도 https 만 (20261114150000, D-096)
const badPoster = await admin.from("matches").insert({ competition: "c", kickoff: "2026-01-01T00:00:00Z", opponent: "o", matchday_poster_url: "http://example.com/p.jpg" });
check("매치데이 포스터 주소가 https 가 아니면 DB 가 거부", badPoster.error?.code === "23514");
// 7) 연맹 기록 표 (D-082, 명세 1.3) — 시드(supabase/data/2026-11-14_kfl_seed.sql)가 실행된 로컬 DB
const view = await anon.from("player_season_stats").select("player_id");
check("anon 선수 시즌 기록 뷰 조회 가능", !view.error);
check("anon kfl_games 공개 열 조회 가능", !(await anon.from("kfl_games").select("league_seq, game_number, match_id")).error);
for (const [t, col] of [["kfl_games", "note"], ["match_appearances", "note"], ["match_appearances", "suggested_player_id"], ["match_appearances", "updated_by"], ["kfl_clubs", "updated_by"], ["kfl_leagues", "updated_by"], ["kfl_games", "applied_hash"]]) {
  check(`anon ${t}.${col} 조회 거부`, Boolean((await anon.from(t).select(col).limit(1)).error));
}
for (const t of ["kfl_sync_state", "kfl_sheet_snapshots", "player_season_numbers", "namu_player_docs"]) {
  const r = await anon.from(t).select("*").limit(1);
  check(`anon ${t} 조회 거부`, Boolean(r.error));
  const u = await user.from(t).select("*").limit(1);
  check(`비관리자 ${t} 행 안 보임`, !u.error && u.data.length === 0);
}
check("관리자 kfl_sync_state 보임", (await admin.from("kfl_sync_state").select("id")).data?.length === 1);
const lg = await user.from("kfl_leagues").update({ stats_live: true }).eq("league_seq", 116).select("league_seq");
check("비관리자 kfl_leagues 쓰기 거부", !lg.data?.length);
const lgA = await admin.from("kfl_leagues").update({ stats_live: false }).eq("league_seq", 116).select("league_seq");
check("관리자 kfl_leagues 쓰기 허용", lgA.data?.length === 1);
check("관리자 kfl_games 허용 열(state) 수정 가능", !(await admin.from("kfl_games").update({ state: "reviewed" }).eq("league_seq", 0)).error);
check("관리자 kfl_games 허용 밖 열(home_score) 수정 거부", Boolean((await admin.from("kfl_games").update({ home_score: 1 }).eq("league_seq", 0)).error));
check("관리자 kfl_sync_state 허용 열(paused_until) 수정 가능", (await admin.from("kfl_sync_state").update({ paused_until: null }).eq("id", 1).select("id")).data?.length === 1);
check("관리자 kfl_sync_state 허용 밖 열(last_error) 수정 거부", Boolean((await admin.from("kfl_sync_state").update({ last_error: "x" }).eq("id", 1)).error));
check("관리자 match_appearances 허용 밖 열(goal_minutes) 수정 거부", Boolean((await admin.from("match_appearances").update({ goal_minutes: [1] }).eq("shirt_number", -1)).error));
// 출전 기록이 있는 선수 삭제는 23503 — 서버 키 없이 만들 수 없어, 관리자가 쓸 수 있는 표만으로는 확인하지 못한다.
// 로컬에서 psql 로 확인: supabase/tests/kfl-records.sql
console.log(fail ? `\n${fail} FAILED` : "\nALL PASS");
process.exit(fail ? 1 : 0);
