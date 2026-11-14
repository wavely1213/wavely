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

  // 매치데이 포스터 (D-096) — 비워 두면 열을 보내지 않는다(마이그레이션 전 DB 에서도 저장되게)
  const poster = await resolveImage(ctx, f, "matchday_poster", "matchday", null);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("matches").insert({ ...values, ...(poster ? { matchday_poster_url: poster } : {}) });
  if (error) {
    await removeImage(ctx, poster); // 방금 올린 파일이 고아로 남지 않게
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }

  updateTag(TAGS.matches);
  redirect("/admin/matches");
}

export async function updateMatch(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 대상 행이 아직 있는지, 지금 포스터는 무엇인지 DB 에서 다시 읽는다 (select * — 마이그레이션 전 DB 에는 포스터 열이 없다)
  const { data: current } = await ctx.supabase.from("matches").select("*").eq("id", id).maybeSingle<{ matchday_poster_url?: string | null }>();
  if (!current) return { message: "이미 삭제된 항목입니다." };

  const f = new FormReader(fd);
  const values = readMatch(f);
  if (f.hasErrors) return f.state();

  const before = current.matchday_poster_url ?? null;
  const poster = await resolveImage(ctx, f, "matchday_poster", "matchday", before);
  if (f.hasErrors) return f.state();
  const changed = poster !== before;

  const { error } = await ctx.supabase.from("matches").update({ ...values, ...(changed ? { matchday_poster_url: poster } : {}) }).eq("id", id);
  if (error) {
    if (changed) await removeImage(ctx, poster);
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }
  if (changed) await removeImage(ctx, before);

  updateTag(TAGS.matches);
  redirect("/admin/matches");
}

export async function deleteMatch(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");

  const { data } = await ctx.supabase.from("matches").delete().eq("id", id).select("*").maybeSingle<{ matchday_poster_url?: string | null }>();
  await removeImage(ctx, data?.matchday_poster_url);
  updateTag(TAGS.matches);
  redirect("/admin/matches");
}
