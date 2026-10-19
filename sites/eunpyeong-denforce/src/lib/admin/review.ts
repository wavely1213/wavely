import "server-only";
import type { AdminContext } from "./auth";

// 검토 대기 표시용 (D-057) — 최고 관리자/관리자 로그인 계정 ID. 이 목록에 없는 계정이 올린 비공개 글이 검토 대기다.
// 글의 created_by 는 로그인 계정 ID (I-042). 미디어 계정은 자기 글만 보이므로 빈 목록이면 된다 (DB 함수도 빈 결과).
export async function adminUserIds(ctx: AdminContext): Promise<Set<string>> {
  if (ctx.role === "media") return new Set();
  const { data } = await ctx.supabase.rpc("admin_user_ids");
  return new Set(((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
}
