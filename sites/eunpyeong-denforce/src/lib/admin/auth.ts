import "server-only";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";

// 관리자 권한 확인 (DAL). 레이아웃 검사에 기대지 않고 모든 관리자 페이지·서버 액션에서 각각 호출한다.
// 판단 기준은 DB 의 public.is_admin() — admins 허용 목록 + 이메일 인증 여부 (RLS 와 같은 함수).

export type AdminContext = {
  supabase: Awaited<ReturnType<typeof createSessionClient>>;
  email: string;
};

async function resolveAdmin(): Promise<AdminContext | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSessionClient();
  // getUser() 는 Auth 서버에 토큰을 검증받는다 (쿠키 값만 믿지 않음)
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;
  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError || isAdmin !== true) return null;
  return { supabase, email: data.user.email };
}

/** 관리자 페이지용 — 관리자가 아니면 로그인 화면으로 보낸다. Suspense 안에서 호출. */
export async function requireAdminPage(): Promise<AdminContext> {
  const ctx = await resolveAdmin();
  if (!ctx) redirect("/admin/login");
  return ctx;
}

/** 서버 액션용 — 관리자가 아니면 null (액션은 오류 메시지를 돌려준다). */
export async function requireAdminAction(): Promise<AdminContext | null> {
  return resolveAdmin();
}

export const NOT_ADMIN_MESSAGE = "관리자 로그인이 필요합니다. 다시 로그인해 주세요.";
