"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { POSITION_ORDER } from "@/data/people";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import { removeImage, resolveImage } from "@/lib/admin/storage";
import type { PlayerRow } from "@/lib/data/rows";

// 선수 관리 서버 액션 — 모든 액션이 직접 관리자 권한을 확인한다 (페이지 검사에 기대지 않음).
// 순서: 권한 → 입력 검증 → 이미지 업로드 → DB 저장 → updateTag → redirect

/** DB check: slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' */
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** 기록(출전·득점·도움) — DB check (≥ 0) + integer 컬럼 상한 (넘으면 DB 오류가 나므로 폼에서 먼저 막는다) */
const PG_INT_MAX = 2_147_483_647;

function readPlayer(f: FormReader) {
  const number = f.int("number", { label: "등번호", min: 0, max: 99 });
  const typedSlug = f.optText("slug", {
    label: "주소",
    pattern: SLUG,
    patternHint: "주소는 영문 소문자/숫자와 하이픈(-)만 쓸 수 있습니다. 예: no-7, kim-minsu",
  });

  // 주소를 비우면 등번호로 만든다 (no-<번호>). 등번호도 없으면 직접 입력해야 한다.
  let slug = typedSlug ?? "";
  if (typedSlug === null && !f.errors.number) {
    if (number !== null) slug = `no-${number}`;
    else f.errors.slug = "등번호가 없으면 주소를 직접 입력해 주세요. 예: kim-minsu";
  }

  const stat = (name: string, label: string) => f.int(name, { label, min: 0, max: PG_INT_MAX, required: true });

  return {
    number,
    name: f.text("name", { label: "이름", max: 40 }),
    position: f.choice("position", POSITION_ORDER, "포지션"),
    slug,
    birth: f.optDate("birth", "생년월일"),
    height_cm: f.int("height_cm", { label: "신장", min: 100, max: 250 }),
    apps: stat("apps", "출전"),
    goals: stat("goals", "득점"),
    assists: stat("assists", "도움"),
    is_active: f.bool("is_active"),
  };
}

/** DB 오류 → 폼 상태. slug 는 players 의 유일한 unique 컬럼이라 중복(23505)이면 주소 칸에도 표시한다. */
function dbFailure(error: { code?: string; message?: string }, fd: FormData): ActionState {
  const message = dbErrorMessage(error);
  return {
    message,
    errors: error.code === "23505" ? { slug: message } : undefined,
    values: submittedValues(fd),
  };
}

export async function createPlayer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const values = readPlayer(f);
  if (f.hasErrors) return f.state();

  const photo_url = await resolveImage(ctx, f, "photo", "players", null);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("players").insert({ ...values, photo_url });
  if (error) {
    // 저장 실패 시 방금 올린 사진은 고아가 되므로 지운다
    await removeImage(ctx, photo_url);
    return dbFailure(error, fd);
  }

  updateTag(TAGS.players);
  redirect("/admin/players");
}

export async function updatePlayer(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 현재 값은 클라이언트가 아니라 DB 에서 다시 읽는다
  const { data: current } = await ctx.supabase
    .from("players")
    .select("photo_url")
    .eq("id", id)
    .maybeSingle<Pick<PlayerRow, "photo_url">>();
  if (!current) return { message: "이미 삭제된 항목입니다." };

  const f = new FormReader(fd);
  const values = readPlayer(f);
  if (f.hasErrors) return f.state();

  const photo_url = await resolveImage(ctx, f, "photo", "players", current.photo_url);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("players").update({ ...values, photo_url }).eq("id", id);
  if (error) {
    // 새로 올린 사진만 정리 (기존 사진은 그대로 둔다)
    if (photo_url !== current.photo_url) await removeImage(ctx, photo_url);
    return dbFailure(error, fd);
  }
  if (photo_url !== current.photo_url) await removeImage(ctx, current.photo_url);

  updateTag(TAGS.players);
  redirect("/admin/players");
}

export async function deletePlayer(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");

  const { data } = await ctx.supabase
    .from("players")
    .delete()
    .eq("id", id)
    .select("photo_url")
    .maybeSingle<Pick<PlayerRow, "photo_url">>();
  await removeImage(ctx, data?.photo_url);
  updateTag(TAGS.players);
  redirect("/admin/players");
}
