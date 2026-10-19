import "server-only";
import type { AdminContext } from "./auth";

// 검토 대기 표시용 (D-057) — 최고 관리자/관리자 이메일. 이 목록에 없는 계정이 올린 비공개 글이 검토 대기다.
// 관리자 목록은 최고 관리자/관리자만 읽을 수 있고(RLS), 미디어 계정은 자기 글만 보이므로 빈 목록이면 된다.
export async function adminEmails(ctx: AdminContext): Promise<Set<string>> {
  if (ctx.role === "media") return new Set();
  const { data } = await ctx.supabase.from("admins").select("email").in("role", ["owner", "admin"]).returns<Array<{ email: string }>>();
  return new Set((data ?? []).map((r) => r.email.toLowerCase()));
}
