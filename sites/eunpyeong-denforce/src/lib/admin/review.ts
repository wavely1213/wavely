import "server-only";
import type { AdminContext } from "./auth";

// 검토 대기 표시용 (D-057) — 미디어 계정 이메일 목록.
// 관리자 목록은 최고 관리자/관리자만 읽을 수 있어(RLS) 미디어 계정은 자기 이메일만 쓴다.
export async function mediaEmails(ctx: AdminContext): Promise<Set<string>> {
  if (ctx.role === "media") return new Set([ctx.email.toLowerCase()]);
  const { data } = await ctx.supabase.from("admins").select("email").eq("role", "media").returns<Array<{ email: string }>>();
  return new Set((data ?? []).map((r) => r.email.toLowerCase()));
}
