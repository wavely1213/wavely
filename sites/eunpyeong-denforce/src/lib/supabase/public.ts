import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/**
 * 공개 데이터 읽기용 클라이언트 — 쿠키·세션을 쓰지 않으므로 'use cache' 안에서 호출해도 된다.
 * RLS 상 anon 권한(공개 조회)만 가진다.
 */
export function createPublicClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
