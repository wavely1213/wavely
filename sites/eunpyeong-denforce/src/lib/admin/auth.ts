import "server-only";
import { redirect } from "next/navigation";
import { homeFor } from "@/config/admin-nav";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";
import { FULL_ADMIN_ROLES, isAdminRole, postPermsFor, type AdminRole, type MediaPermColumn, type PostPerms } from "./roles";

// 관리자 권한 확인 (DAL). 레이아웃 검사에 기대지 않고 모든 관리자 페이지·서버 액션에서 각각 호출한다.
// 판단 기준은 DB 의 public.my_admin_profile() — admins 허용 목록 + 이메일 인증 여부 (RLS 와 같은 기준).
// 등급 (D-057): 페이지/액션마다 들어올 수 있는 등급을 넘긴다. 안 넘기면 최고 관리자/관리자만.

export type AdminContext = {
  supabase: Awaited<ReturnType<typeof createSessionClient>>;
  email: string;
  role: AdminRole;
  /** 글 권한 — 미디어 계정만 계정별로 다르다 */
  perms: PostPerms;
};

type ProfileRow = { email: string; role: string } & Record<MediaPermColumn, boolean>;

async function resolveAdmin(): Promise<AdminContext | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSessionClient();
  // getUser() 는 Auth 서버에 토큰을 검증받는다 (쿠키 값만 믿지 않음)
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  const { data: profile, error: rpcError } = await supabase.rpc("my_admin_profile").maybeSingle<ProfileRow>();
  if (rpcError || !profile || !isAdminRole(profile.role)) return null;
  return { supabase, email: data.user.email, role: profile.role, perms: postPermsFor(profile.role, profile) };
}

/**
 * 관리자 페이지용 — 로그인한 관리자가 아니면 로그인 화면으로, 등급이 맞지 않으면 그 등급의 첫 화면으로 보낸다.
 * Suspense 안에서 호출.
 */
export async function requireAdminPage(roles: readonly AdminRole[] = FULL_ADMIN_ROLES): Promise<AdminContext> {
  const ctx = await resolveAdmin();
  if (!ctx) redirect("/admin/login");
  if (!roles.includes(ctx.role)) redirect(homeFor(ctx.role));
  return ctx;
}

/** 서버 액션용 — 관리자가 아니거나 등급이 맞지 않으면 null (액션은 오류 메시지를 돌려준다). */
export async function requireAdminAction(roles: readonly AdminRole[] = FULL_ADMIN_ROLES): Promise<AdminContext | null> {
  const ctx = await resolveAdmin();
  return ctx && roles.includes(ctx.role) ? ctx : null;
}

export const NOT_ADMIN_MESSAGE = "관리자 로그인이 필요합니다. 다시 로그인해 주세요.";
