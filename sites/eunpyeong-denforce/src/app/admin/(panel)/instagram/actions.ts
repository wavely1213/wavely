"use server";

import { redirect } from "next/navigation";
import { requireAdminAction } from "@/lib/admin/auth";
import { INSTAGRAM_MAX_ATTEMPTS } from "@/lib/admin/instagram";

// 인스타 자동 반영 (D-065) — 관리자는 '확인 필요/실패'를 '확인함'으로만 바꾼다 (DB 정책도 같은 규칙).
// 아직 다시 시도할 실패 글은 바꾸지 않는다 — 확인함을 누르면 다시 시도가 멈추므로 (화면에도 버튼 없음)

const PAGE = "/admin/instagram";

export async function markInstagramReviewed(code: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");
  await ctx.supabase
    .from("instagram_posts")
    .update({ status: "reviewed", updated_at: new Date().toISOString() })
    .eq("code", code)
    .or(`status.eq.review,and(status.eq.error,attempts.gte.${INSTAGRAM_MAX_ATTEMPTS})`);
  redirect(PAGE);
}
