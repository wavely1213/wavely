// 구단 인스타그램 자동 반영 (D-065, BR-029) — Supabase 예약 실행(pg_cron)이 15분마다 부른다. AI 를 쓰지 않는다.
// 공개 프로필 임베드에서 최근 6개를 읽고, 처음 보는 게시물만 규칙대로 사이트에 넣은 뒤 instagram_posts 에 기록한다.
// 쓰기는 이 함수 안에서만 서버 키(SUPABASE_SERVICE_ROLE_KEY, Supabase 가 넣어 줌)로 — 사이트 코드에는 비밀 키가 없다(SECURITY_GUIDELINES).
// 호출 확인: x-sync-secret 헤더 = Vault 의 instagram_sync_secret (DB 함수 instagram_sync_secret_ok 로 비교, 값은 DB 밖으로 나가지 않는다).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.117.3";
import { classifyPost, knownCodes, parseProfileEmbed, type IgPost } from "./embed.ts";
import { nameSlug } from "./korean.ts";
import {
  ACCOUNT,
  farewellNews,
  kstDate,
  parseFarewell,
  parseWelcome,
  planFarewell,
  planMatchday,
  planResult,
  planWelcome,
  positionLabel,
  postingDraft,
  reelNews,
  siteCaption,
  welcomeNews,
  type MatchLite,
  type NewsDraft,
  type Position,
  type RosterPlayer,
} from "./plan.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUBLIC_MEDIA = `${SUPABASE_URL}/storage/v1/object/public/media/`;
/** 실패한 게시물을 다시 시도하는 횟수 — 넘으면 대시보드에 '오류'로 남는다 */
const MAX_ATTEMPTS = 3;
/** 이전 실행이 이 시간 넘게 끝나지 않았으면 멈춘 것으로 보고 새로 시작 */
const STALE_MS = 5 * 60_000;

// 브라우저처럼 보내야 게시물이 담긴 HTML 을 준다 (D-064)
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

type Db = SupabaseClient;
type PostRecord = { code: string; status: string; attempts: number; actions: string };
type Outcome = { actions: string[]; notes: string[] };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>, what: string): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

async function sha16(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/** 게시물 사진 — oEmbed 표지(640px 세로형, 2026-10-17 이후 같은 사진). 안 되면 임베드의 사진 */
async function postImage(post: IgPost): Promise<Uint8Array> {
  let src = post.displayUrl;
  try {
    const res = await fetch(`https://www.instagram.com/api/v1/oembed/?url=https://www.instagram.com/p/${post.code}/`, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) src = ((await res.json()) as { thumbnail_url?: string }).thumbnail_url ?? src;
  } catch {
    // 임베드 사진으로
  }
  if (!src) throw new Error("사진 주소 없음");
  const img = await fetch(src);
  if (!img.ok) throw new Error(`사진 받기 실패 ${img.status}`);
  return new Uint8Array(await img.arrayBuffer());
}

/** 사진 올리기 — 주소가 정해져 있어 다시 시도해도 같은 파일 (덮어쓰기) */
async function upload(db: Db, path: string, bytes: Uint8Array): Promise<string> {
  const { error } = await db.storage.from("media").upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(`사진 올리기 ${path}: ${error.message}`);
  return PUBLIC_MEDIA + path;
}

async function insertNews(db: Db, draft: NewsDraft, exists: () => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>): Promise<boolean> {
  const found = await must(exists(), "구단소식 확인");
  if (found?.length) return false;
  await must(db.from("news_posts").insert({ ...draft, featured: false }), "구단소식 넣기");
  return true;
}

/** 같은 사람 인사 기사가 앞뒤 3일 안에 이미 있는지 — 직접 쓴 기사(다른 사진 주소)와 겹치지 않게. 있으면 그 제목 */
async function personArticle(db: Db, name: string, date: string): Promise<string | null> {
  const shift = (days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  const rows = await must(
    db.from("news_posts").select("title").eq("category", "news").ilike("title", `%${name}%`).gte("date", shift(-3)).lte("date", shift(3)).limit(1),
    "같은 사람 기사 확인",
  );
  return (rows as { title: string }[] | null)?.[0]?.title ?? null;
}

/**
 * 게시물 하나 반영 — 종류별 일 → 포스팅. 다시 시도해도 같은 행이 두 번 생기지 않게 있는지 먼저 본다.
 * out 은 부른 쪽 것 — 중간에 실패해도 그때까지 한 일이 기록에 남는다. prevActions = 이전 시도에서 한 일 (다시 시도할 때 엉뚱한 메모를 남기지 않게)
 */
async function apply(db: Db, post: IgPost, roster: RosterPlayer[], matches: MatchLite[], prevActions: string, out: Outcome): Promise<void> {
  const type = classifyPost(post);
  const date = kstDate(post.takenAt);
  const bytes = await postImage(post);
  const newsImage = () => upload(db, `news/ig-${post.code}-1.jpg`, bytes);
  const newsByImage = (url: string) => () => db.from("news_posts").select("id").contains("images", [url]).limit(1);

  if (type === "reel") {
    const thumb = await upload(db, `news/reel-${post.code}.jpg`, bytes);
    const draft = reelNews(post, thumb);
    const added = await insertNews(db, draft, () => db.from("news_posts").select("id").ilike("video_url", `%${post.code}%`).limit(1));
    if (added) out.actions.push(`구단영상: ${draft.title}`);
  } else if (type === "welcome") {
    const w = parseWelcome(post.caption);
    if (!w) {
      out.notes.push("WELCOME 글에서 선수 한 명의 이름을 읽지 못함 (스태프 영입이거나 여러 명일 수 있음) — 직접 확인");
    } else {
      // 이전 시도에서 이미 추가한 선수면 그대로 쓴다
      const added = prevActions.includes(`선수 추가: ${w.name} `) ? roster.find((p) => p.name === w.name && p.slug.startsWith(nameSlug(w.name))) : undefined;
      const plan = added ? { add: null, note: null } : planWelcome(w, roster);
      if (plan.add) {
        const photo = await upload(db, `players/${plan.add.slug}-instagram.jpg`, bytes);
        await must(db.from("players").insert({ ...plan.add, number: null, photo_url: photo, is_active: true }), "선수 넣기");
        roster.push({ id: "", name: plan.add.name, is_active: true, position: plan.add.position, slug: plan.add.slug });
        out.actions.push(`선수 추가: ${plan.add.name} ${positionLabel(plan.add.position)} (등번호 공란)`);
      }
      if (plan.note) out.notes.push(plan.note);
      const url = await newsImage();
      const draft = welcomeNews(post, w, url, plan.add?.slug ?? added?.slug ?? null);
      const mine = await must(newsByImage(url)(), "구단소식 확인");
      const other = mine?.length ? null : await personArticle(db, w.name, date);
      if (other) out.notes.push(`${w.name} 기사가 이미 있어 영입 기사는 넣지 않음 ('${other}')`);
      else if (await insertNews(db, draft, newsByImage(url))) out.actions.push(`영입 기사: ${draft.title}`);
    }
  } else if (type === "farewell") {
    const f = parseFarewell(post.caption);
    if (!f) {
      out.notes.push("작별 글에서 이름을 읽지 못함 — 직접 확인");
    } else {
      // 이전 시도에서 이미 활동을 껐으면 그 선수로 이어서
      const done = f.role === "선수" && prevActions.includes(`선수 활동 끔: ${f.name}`);
      const off = done ? roster.filter((p) => p.name === f.name && !p.is_active) : [];
      const plan = done ? { deactivate: null, publish: true, note: null } : planFarewell(f, roster);
      if (plan.deactivate) {
        await must(db.from("players").update({ is_active: false }).eq("id", plan.deactivate.id), "선수 활동 끄기");
        plan.deactivate.is_active = false;
        out.actions.push(`선수 활동 끔: ${f.name}`);
      }
      if (plan.note) out.notes.push(plan.note);
      if (plan.publish) {
        const url = await newsImage();
        const position = (plan.deactivate?.position ?? (off.length === 1 ? off[0].position : null) ?? null) as Position | null;
        const draft = farewellNews(post, f, url, position);
        const mine = await must(newsByImage(url)(), "구단소식 확인");
        const other = mine?.length ? null : await personArticle(db, f.name, date);
        if (other) out.notes.push(`${f.name} 기사가 이미 있어 작별 기사는 넣지 않음 ('${other}')`);
        else if (await insertNews(db, draft, newsByImage(url))) out.actions.push(`작별 기사: ${draft.title}`);
      }
    }
  } else if (type === "matchday") {
    const plan = planMatchday(post, matches);
    if (plan.insert) {
      const [row] = await must(db.from("matches").insert(plan.insert).select("id, kickoff, opponent, status, score_us, score_them, venue"), "경기 넣기");
      matches.push(row as MatchLite);
      out.actions.push(`경기 일정: ${plan.insert.competition} ${plan.insert.round} vs ${plan.insert.opponent} (${plan.insert.kickoff.slice(0, 16).replace("T", " ")})`);
    }
    if (plan.note) out.notes.push(plan.note);
  } else if (type === "result") {
    const plan = planResult(post, matches);
    if (plan.update) {
      const { id, ...values } = plan.update;
      await must(db.from("matches").update(values).eq("id", id), "경기 결과 넣기");
      const m = matches.find((x) => x.id === id);
      if (m) Object.assign(m, values);
      out.actions.push(`경기 결과: ${values.score_us}:${values.score_them}${values.scorers ? ` (득점 ${values.scorers})` : ""}`);
    }
    if (plan.note) out.notes.push(plan.note);
  }

  // 모든 게시물 → 포스팅 (BR-029). 마지막에 넣어 '이미 넣은 게시물' 표시가 된다
  const thumb = await upload(db, `postings/${await sha16(post.code)}.jpg`, bytes);
  const posting = postingDraft(post, type);
  const inserted = await must(
    db.from("postings").upsert({ ...posting, thumbnail_url: thumb, published: true }, { onConflict: "url", ignoreDuplicates: true }).select("id"),
    "포스팅 넣기",
  );
  if (inserted?.length) out.actions.push("포스팅");
}

/** 최근 6개가 모두 처음 보는 게시물이면 그 사이 더 올라온 글이 가려졌을 수 있다 */
const MISSED_WARNING = "최근 게시물 6개가 모두 처음 보는 글입니다 — 그 사이 더 올라온 글이 빠졌을 수 있으니 인스타그램에서 직접 확인해 주세요.";

const chars = (s: string, max: number) => [...s].slice(0, max).join("");

async function sync(db: Db) {
  const res = await fetch(`https://www.instagram.com/${ACCOUNT}/embed/`, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`인스타그램 임베드 ${res.status}`);
  const posts = parseProfileEmbed(await res.text());

  const codes = posts.map((p) => p.code);
  const records = await must(db.from("instagram_posts").select("code, status, attempts, actions").in("code", codes), "기록 읽기");
  const byCode = new Map((records as PostRecord[]).map((r) => [r.code, r]));
  // 공개된 포스팅만 '이미 넣은 게시물'로 본다 — 미디어 계정이 비공개 초안으로 같은 주소를 넣어도 건너뛰지 않게
  const postingUrls = await must(db.from("postings").select("url").eq("published", true).ilike("url", "%instagram.com%"), "포스팅 읽기");
  const known = knownCodes((postingUrls as { url: string }[]).map((r) => r.url));

  const unseen = posts.filter((p) => !byCode.has(p.code) && !known.has(p.code));
  const warning = posts.length >= 6 && unseen.length === posts.length ? MISSED_WARNING : null;

  // 처음 보는 게시물 + 실패해서 다시 시도할 게시물 (오래된 것부터)
  const todo = posts
    .filter((p) => {
      const r = byCode.get(p.code);
      if (r) return r.status === "error" && r.attempts < MAX_ATTEMPTS;
      return !known.has(p.code);
    })
    .reverse();
  if (!todo.length) return { checked: posts.length, processed: 0, warning };

  const roster = (await must(db.from("players").select("id, name, is_active, position, slug"), "선수 읽기")) as RosterPlayer[];
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const matches = (await must(
    db.from("matches").select("id, kickoff, opponent, status, score_us, score_them, venue").gte("kickoff", since),
    "경기 읽기",
  )) as MatchLite[];

  const summary = { checked: posts.length, processed: 0, review: 0, errors: 0, warning };
  for (const raw of todo) {
    const prev = byCode.get(raw.code);
    const prevActions = prev?.actions ?? "";
    // 홈페이지에 넣는 글은 중간점(·) 없이 (BR-024). 기록에는 원문
    const post = { ...raw, caption: siteCaption(raw.caption) };
    const base = {
      code: raw.code,
      kind: classifyPost(raw),
      posted_at: new Date(raw.takenAt * 1000).toISOString(),
      caption: chars(raw.caption, 2000),
      attempts: (prev?.attempts ?? 0) + 1,
      updated_at: new Date().toISOString(),
    };
    const out: Outcome = { actions: [], notes: [] };
    // 이전 시도에서 한 일 + 이번에 한 일 (같은 줄은 한 번만)
    const actionsText = () => chars([...new Set([...prevActions.split("\n").filter(Boolean), ...out.actions])].join("\n"), 2000);
    try {
      await apply(db, post, roster, matches, prevActions, out);
      const status = out.notes.length ? "review" : "done";
      await must(db.from("instagram_posts").upsert({ ...base, status, actions: actionsText(), note: chars(out.notes.join("\n"), 2000) || null }), "기록 남기기");
      summary.processed++;
      if (status === "review") summary.review++;
    } catch (e) {
      summary.errors++;
      const message = String(e instanceof Error ? e.message : e).slice(0, 500);
      const { error } = await db
        .from("instagram_posts")
        .upsert({ ...base, status: "error", actions: actionsText(), note: chars([...out.notes, `오류: ${message}`].join("\n"), 2000) });
      if (error) console.error(`기록 남기기 실패 ${raw.code}: ${error.message}`);
    }
  }
  return summary;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server not configured" }, 500);
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: ok } = await db.rpc("instagram_sync_secret_ok", { p_secret: req.headers.get("x-sync-secret") ?? "" });
  if (ok !== true) return json({ error: "unauthorized" }, 401);

  // 겹쳐 돌지 않게 — 실행 중 표시를 잡은 쪽만 진행
  const nowIso = new Date().toISOString();
  const staleBefore = new Date(Date.now() - STALE_MS).toISOString();
  const { data: claimed } = await db
    .from("instagram_sync_state")
    .update({ running_since: nowIso })
    .eq("id", 1)
    .or(`running_since.is.null,running_since.lt.${staleBefore}`)
    .select("id");
  if (!claimed?.length) return json({ skipped: "already running" });

  try {
    const result = await sync(db);
    const done = new Date().toISOString();
    await db
      .from("instagram_sync_state")
      .update({ running_since: null, last_run_at: done, last_ok_at: done, last_error: null, last_warning: result.warning, last_processed: result.processed })
      .eq("id", 1);
    return json({ ok: true, ...result, at: kstDate(Date.now() / 1000) });
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e).slice(0, 500);
    await db.from("instagram_sync_state").update({ running_since: null, last_run_at: new Date().toISOString(), last_error: message }).eq("id", 1);
    return json({ ok: false, error: message }, 500);
  }
});
