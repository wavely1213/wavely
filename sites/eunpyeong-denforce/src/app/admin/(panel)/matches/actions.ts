"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, isoToKst, kstToIso, submittedValues, type ActionState } from "@/lib/admin/form";
import { removeImage, resolveImage } from "@/lib/admin/storage";
import { MATCH_SIDES, MATCH_STATUSES } from "./labels";

// 경기 관리 서버 액션 — 모든 액션이 직접 관리자 권한을 확인한다 (페이지 검사에 기대지 않음).
// 순서: 권한 → 입력 검증 → DB 저장 → updateTag → redirect

/** 포스터를 누르면 갈 게시물은 인스타그램만 (DB check matches_*_post_url_check) */
const isInstagramUrl = (u: string) => u.startsWith("https://www.instagram.com/");

// 포스터 칸 (D-096) — 폼 이름 → DB 열. 마이그레이션 전 DB 에서도 저장되게, 바뀐 칸만 보낸다
const POSTERS = [
  ["matchday_poster", "matchday_poster_url"],
  ["fulltime_poster", "fulltime_poster_url"],
] as const;
type PosterColumns = {
  matchday_poster_url?: string | null;
  fulltime_poster_url?: string | null;
  matchday_post_url?: string | null;
  fulltime_post_url?: string | null;
};

/**
 * 포스터를 누르면 갈 인스타 게시물 (D-096) — 폼을 열 때 값(<name>_initial 숨은 칸)과 다른 칸만 보낸다.
 * 저장 시점 DB 와 비교하면, 폼을 연 사이 instagram-sync 가 채운 칸을 빈 폼 값으로 지워 버린다 (총괄 검토).
 * 마이그레이션 전 DB 에서도 저장되게 바뀐 칸만.
 */
function readPostLinks(f: FormReader): Record<string, string | null> {
  const opened: PosterColumns = {
    matchday_post_url: f.optText("matchday_post_url_initial", { label: "MATCH DAY 게시물", max: 500 }),
    fulltime_post_url: f.optText("fulltime_post_url_initial", { label: "FULL TIME 게시물", max: 500 }),
  };
  const next = {
    matchday_post_url: f.optHttpsUrl("matchday_post_url", "MATCH DAY 게시물"),
    fulltime_post_url: f.optHttpsUrl("fulltime_post_url", "FULL TIME 게시물"),
  };
  // DB check 와 같게 인스타그램 주소만
  for (const [k, v] of Object.entries(next)) {
    if (v && !isInstagramUrl(v)) f.reject(k, "인스타그램 게시물 주소(https://www.instagram.com/…)만 넣을 수 있습니다.");
  }
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => v !== (opened[k as keyof PosterColumns] ?? null)));
}

/** 포스터 이미지 처리 → 바뀐 칸만 { 열: 새 주소 }, 그리고 지울 옛 파일/새로 올린 파일 */
async function resolvePosters(ctx: NonNullable<Awaited<ReturnType<typeof requireAdminAction>>>, f: FormReader, current: PosterColumns) {
  const changes: Record<string, string | null> = {};
  const replaced: Array<string | null> = [];
  const uploaded: Array<string | null> = [];
  for (const [name, column] of POSTERS) {
    const before = current[column] ?? null;
    const next = await resolveImage(ctx, f, name, "matchday", before);
    if (next !== before) {
      changes[column] = next;
      replaced.push(before);
      uploaded.push(next);
    }
  }
  return { changes, replaced, uploaded };
}

function readMatch(f: FormReader) {
  const competition = f.text("competition", { label: "대회", max: 60 });
  const round = f.optText("round", { label: "라운드", max: 30 }) ?? "";
  const date = f.text("kickoff_date", {
    label: "날짜",
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    patternHint: "날짜는 YYYY-MM-DD 형식으로 입력해 주세요.",
  });
  const time = f.text("kickoff_time", {
    label: "시간",
    pattern: /^\d{2}:\d{2}$/,
    patternHint: "시간은 HH:MM 형식으로 입력해 주세요.",
  });
  const venue = f.optText("venue", { label: "장소", max: 60 }) ?? "";
  const is_home = f.choice("is_home", MATCH_SIDES, "홈/원정") === "home";
  const opponent = f.text("opponent", { label: "상대", max: 40 });
  const status = f.choice("status", MATCH_STATUSES, "상태");

  // 한국 시간 → ISO. 2월 30일·24:00 처럼 다른 날로 넘어가는 값은 되돌려 비교해 걸러낸다.
  let kickoff = "";
  if (!f.errors.kickoff_date && !f.errors.kickoff_time) {
    const iso = kstToIso(date, time);
    const back = iso ? isoToKst(iso) : null;
    if (!iso || !back || back.date !== date || back.time !== time) {
      f.errors.kickoff_date = "올바른 날짜/시간이 아닙니다.";
    } else {
      kickoff = iso;
    }
  }

  // 불변식 (DB check matches_score_matches_status): 종료면 두 스코어 필수, 예정이면 스코어 없음(입력값 무시)
  const finished = status === "finished";
  const score_us = finished ? f.int("score_us", { label: "우리 득점", min: 0, max: 99, required: true }) : null;
  const score_them = finished ? f.int("score_them", { label: "상대 득점", min: 0, max: 99, required: true }) : null;

  // 경기결과 화면의 영상 버튼·득점자 줄 (DB check: https 500자, 득점자 300자). 득점자도 스코어처럼 종료 경기만 저장한다
  const highlight_url = f.optHttpsUrl("highlight_url", "하이라이트 영상");
  const replay_url = f.optHttpsUrl("replay_url", "다시보기 영상");
  const scorers = finished ? f.optText("scorers", { label: "득점자", max: 300 }) : null;

  return { competition, round, kickoff, venue, is_home, opponent, status, score_us, score_them, highlight_url, replay_url, scorers };
}

export async function createMatch(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const values = readMatch(f);
  if (f.hasErrors) return f.state();

  // 포스터 (D-096) — 비워 두면 열을 보내지 않는다
  const links = readPostLinks(f);
  if (f.hasErrors) return f.state();
  const posters = await resolvePosters(ctx, f, {});
  if (f.hasErrors) {
    for (const u of posters.uploaded) await removeImage(ctx, u); // 다른 칸 검사 실패 — 방금 올린 파일 지움
    return f.state();
  }

  const { error } = await ctx.supabase.from("matches").insert({ ...values, ...links, ...posters.changes });
  if (error) {
    for (const u of posters.uploaded) await removeImage(ctx, u); // 방금 올린 파일이 고아로 남지 않게
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }

  updateTag(TAGS.matches);
  redirect("/admin/matches");
}

export async function updateMatch(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 대상 행이 아직 있는지, 지금 포스터는 무엇인지 DB 에서 다시 읽는다 (select * — 마이그레이션 전 DB 에는 포스터 열이 없다)
  const { data: current } = await ctx.supabase.from("matches").select("*").eq("id", id).maybeSingle<PosterColumns>();
  if (!current) return { message: "이미 삭제된 항목입니다." };

  const f = new FormReader(fd);
  const values = readMatch(f);
  if (f.hasErrors) return f.state();

  const links = readPostLinks(f);
  if (f.hasErrors) return f.state();
  const posters = await resolvePosters(ctx, f, current);
  if (f.hasErrors) {
    for (const u of posters.uploaded) await removeImage(ctx, u);
    return f.state();
  }

  // 폼을 연 뒤 그 행이 바뀌었으면(경기 날 동기화가 영상/결과/포스터를 채움 등) 저장하지 않는다 — 낡은 값으로 덮고,
  // 지운 칸 기록 트리거가 '관리자가 지움'으로 남겨 다시 안 채우는 일을 막는다 (총괄 검토 2026-11-15)
  const openedAt = f.optText("updated_at_initial", { label: "열린 시각", max: 60 });
  let query = ctx.supabase.from("matches").update({ ...values, ...links, ...posters.changes }).eq("id", id);
  if (openedAt) query = query.eq("updated_at", openedAt);
  const { data: saved, error } = await query.select("id");
  if (error || !saved?.length) {
    for (const u of posters.uploaded) await removeImage(ctx, u);
    return {
      message: error ? dbErrorMessage(error) : "그 사이 다른 곳에서 이 경기가 바뀌었습니다. 새로고침한 뒤 다시 저장해 주세요.",
      values: submittedValues(fd),
    };
  }
  for (const old of posters.replaced) await removeImage(ctx, old);

  updateTag(TAGS.matches);
  redirect("/admin/matches");
}

export async function deleteMatch(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");

  const { data } = await ctx.supabase.from("matches").delete().eq("id", id).select("*").maybeSingle<PosterColumns>();
  await removeImage(ctx, data?.matchday_poster_url);
  await removeImage(ctx, data?.fulltime_poster_url);
  updateTag(TAGS.matches);
  redirect("/admin/matches");
}
