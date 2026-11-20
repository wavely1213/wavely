"use server";

import { redirect } from "next/navigation";
import { EMAIL_PATTERN, normalizeEmail, selfChangeError } from "@/lib/admin/accounts";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import { ADMIN_ROLES, MEDIA_PERMS, OWNER_ROLES, type MediaPermColumn } from "@/lib/admin/roles";

// 관리자 계정 서버 액션 (D-057) — 최고 관리자만. DB 정책(admins: 최고 관리자 추가/수정/삭제)도 같은 규칙이고,
// 최고 관리자가 한 명도 남지 않는 변경은 DB 트리거(admins_keep_one_owner)가 막는다.
// 순서: 권한 → 입력 검증 → 내 계정 보호 → DB 저장 → redirect

const LIST = "/admin/accounts";

/** 등급 + 미디어 권한 — 미디어가 아니면 권한은 모두 끈다 */
function readAccount(f: FormReader) {
  const role = f.choice("role", ADMIN_ROLES, "등급");
  const perms = Object.fromEntries(MEDIA_PERMS.map((p) => [p.column, role === "media" && f.bool(p.column)])) as Record<MediaPermColumn, boolean>;
  return { role, ...perms };
}

function accountErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "이미 등록된 이메일입니다.";
  // admins_keep_one_owner
  if (error.code === "23514" && error.message?.includes("최고 관리자")) return "최고 관리자는 한 명 이상 있어야 합니다.";
  return dbErrorMessage(error);
}

export async function createAccount(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction(OWNER_ROLES);
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const email = normalizeEmail(
    f.text("email", { label: "이메일", max: 254, pattern: EMAIL_PATTERN, patternHint: "이메일 형식이 올바르지 않습니다. 예: media@eunpyeong-fs.com" }),
  );
  const values = readAccount(f);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("admins").insert({ email, ...values });
  if (error) return { message: accountErrorMessage(error), values: submittedValues(fd) };

  redirect(LIST);
}

export async function updateAccount(email: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction(OWNER_ROLES);
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const values = readAccount(f);
  if (f.hasErrors) return f.state();
  const selfError = selfChangeError(email, ctx.email, values.role);
  if (selfError) return { message: selfError, values: submittedValues(fd) };

  const { data, error } = await ctx.supabase.from("admins").update(values).eq("email", normalizeEmail(email)).select("email");
  if (error) return { message: accountErrorMessage(error), values: submittedValues(fd) };
  if (!data?.length) return { message: "이미 삭제된 계정입니다." };

  redirect(LIST);
}

export async function deleteAccount(email: string): Promise<void> {
  const ctx = await requireAdminAction(OWNER_ROLES);
  if (!ctx) redirect("/admin/login");
  // 내 계정은 지우지 않는다 (버튼도 숨김)
  if (!selfChangeError(email, ctx.email, "delete")) {
    await ctx.supabase.from("admins").delete().eq("email", normalizeEmail(email));
  }
  redirect(LIST);
}
