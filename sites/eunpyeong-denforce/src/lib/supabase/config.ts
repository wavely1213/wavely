// Supabase 연결 설정. 두 값이 모두 있으면 DB 모드, 없으면 정적 데이터 모드(src/data)로 동작한다.
// NEXT_PUBLIC_ 값은 빌드 때 고정된다 — 바꾸면 재배포 필요.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function isSupabaseConfigured() {
  return SUPABASE_URL !== "" && SUPABASE_PUBLISHABLE_KEY !== "";
}

/** 이미지 저장소 버킷 (마이그레이션과 같은 이름) */
export const MEDIA_BUCKET = "media";
