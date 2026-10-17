import type { NextConfig } from "next";
import path from "node:path";

// Supabase Storage 공개 이미지 (관리자가 올린 사진·로고)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const storagePattern = supabaseUrl ? new URL("/storage/v1/object/public/**", supabaseUrl) : null;
// 로컬 Supabase(127.0.0.1)로 개발·테스트할 때만 로컬 IP 이미지 최적화 허용
const isLocalSupabase = storagePattern ? ["127.0.0.1", "localhost"].includes(storagePattern.hostname) : false;

const nextConfig: NextConfig = {
  // 상위 wavely 저장소의 lockfile 을 루트로 오인하지 않도록 고정
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: storagePattern ? [storagePattern] : [],
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  experimental: {
    // 관리자 이미지 업로드(최대 5MB) + 폼 필드 여유분
    serverActions: { bodySizeLimit: "6mb" },
    proxyClientMaxBodySize: "6mb",
  },
  // 1차 메뉴 주소만 친 경우 첫 하위 페이지로 보낸다
  async redirects() {
    return [
      { source: "/team", destination: "/team/players", permanent: false },
      { source: "/match", destination: "/match/schedule", permanent: false },
    ];
  },
};

export default nextConfig;
