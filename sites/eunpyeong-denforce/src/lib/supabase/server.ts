import "server-only";
import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/**
 * 로그인 세션(쿠키) 기반 클라이언트 — 관리자 화면·서버 액션 전용.
 * cookies() 를 읽으므로 Suspense 안 또는 서버 액션에서만 호출한다. 'use cache' 안에서는 금지.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  // Supabase Auth 는 내부에서 Date.now() 로 토큰 만료를 계산한다 → 요청 시점에만 실행되도록 표시
  await io();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트 렌더 중에는 쿠키를 쓸 수 없다 — 세션 갱신은 proxy.ts 가 맡는다
        }
      },
    },
  });
}
