// 피그마 플러그인용 이미지 중계 — GET /api/figma/image?src=<피드에 나온 이미지 절대 주소> (D-066)
// 플러그인이 eunpyeong-fs.com 밖(Supabase 저장소)에 직접 접속할 수 없어서 대신 받아 CORS 를 붙여 돌려준다.
// 허용 목록(lib/figma-image.ts): 사이트 public 파일, Supabase 공개 media 버킷. PNG/JPEG/GIF 만, 10MB 까지.
import type { NextRequest } from "next/server";
import { SITE } from "@/config/site";
import { FIGMA_IMAGE_MAX_BYTES, figmaImageSource, isFigmaImageType } from "@/lib/figma-image";
import { MEDIA_BUCKET, SUPABASE_URL } from "@/lib/supabase/config";

const CORS = { "Access-Control-Allow-Origin": "*" };

function fail(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: CORS });
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src") ?? "";
  const url = figmaImageSource(src, SITE.url, SUPABASE_URL, MEDIA_BUCKET);
  if (!url) return fail(400, "허용하지 않는 이미지 주소입니다");

  let res: Response;
  try {
    res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15_000) });
  } catch {
    return fail(502, "이미지를 받지 못했습니다");
  }
  if (!res.ok) return fail(res.status === 404 ? 404 : 502, `이미지를 받지 못했습니다 (${res.status})`);
  const type = res.headers.get("content-type");
  if (!isFigmaImageType(type)) return fail(415, "피그마에 넣을 수 없는 형식입니다 (PNG/JPEG/GIF 만)");
  const length = Number(res.headers.get("content-length") ?? "0");
  if (length > FIGMA_IMAGE_MAX_BYTES) return fail(413, "이미지가 너무 큽니다");
  const body = await res.arrayBuffer();
  if (body.byteLength > FIGMA_IMAGE_MAX_BYTES) return fail(413, "이미지가 너무 큽니다");

  return new Response(body, {
    headers: { ...CORS, "Content-Type": type ?? "application/octet-stream", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
