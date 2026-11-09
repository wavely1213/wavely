// 피그마 플러그인용 이미지 중계의 허용 목록 (D-066) — 순수 함수 (테스트: figma-feed.test.ts).
// 플러그인은 eunpyeong-fs.com 에만 접속할 수 있고(manifest networkAccess), 화면 출처가 null 이라 CORS 가 필요하다.
// 그래서 피드에 나온 이미지(사이트 public 파일, Supabase 공개 media 버킷)만 /api/figma/image 가 대신 받아 준다.
// 아무 주소나 받아 주면 남의 서버를 대신 부르는 통로(SSRF)가 되므로 아래 두 곳만 허용한다.

/** 이미지 최대 크기 — 관리자 업로드 한도(5MB)보다 넉넉히 */
export const FIGMA_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/**
 * 받아도 되는 이미지 주소면 URL, 아니면 null.
 * - 사이트 주소(siteUrl)의 경로 — /api/ 와 /admin 은 뺀다
 * - Supabase 공개 저장소 `${supabaseUrl}/storage/v1/object/public/${bucket}/…`
 * 사용자 정보/쿼리 문자열/다른 포트/../ 가 섞인 주소는 받지 않는다.
 */
export function figmaImageSource(src: string, siteUrl: string, supabaseUrl: string, bucket: string): URL | null {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (/(^|\/)\.\.?(\/|$)/.test(decodeURIComponent(url.pathname))) return null;
  const site = new URL(siteUrl);
  if (url.origin === site.origin) {
    return /^\/(api|admin)(\/|$)/.test(url.pathname) || url.pathname === "/" ? null : url;
  }
  if (supabaseUrl) {
    const prefix = new URL(`/storage/v1/object/public/${bucket}/`, supabaseUrl);
    if (url.origin === prefix.origin && url.pathname.startsWith(prefix.pathname) && url.pathname.length > prefix.pathname.length) return url;
  }
  return null;
}

/** 피그마가 넣을 수 있는 그림 형식 (createImage: PNG/JPEG/GIF) */
export function isFigmaImageType(contentType: string | null): boolean {
  return /^image\/(png|jpeg|gif)\b/i.test(contentType ?? "");
}
