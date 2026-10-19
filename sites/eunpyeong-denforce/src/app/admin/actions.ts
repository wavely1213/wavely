"use server";

import { redirect } from "next/navigation";
import { submittedValues, type ActionState } from "@/lib/admin/form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSessionClient } from "@/lib/supabase/server";

// 관리자 로그인·로그아웃

export async function signIn(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { message: "Supabase 가 설정되지 않았습니다. 설정 가이드를 확인해 주세요." };

  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) {
    return { message: "이메일과 비밀번호를 입력해 주세요.", values: submittedValues(fd) };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // 계정 존재 여부를 드러내지 않도록 같은 문구를 쓴다
  if (error) return { message: "이메일 또는 비밀번호가 올바르지 않습니다.", values: submittedValues(fd) };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { message: "관리자 권한이 없는 계정입니다.", values: submittedValues(fd) };
  }

  redirect("/admin");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
