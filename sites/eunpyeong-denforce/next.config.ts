import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // 상위 wavely 저장소의 lockfile 을 루트로 오인하지 않도록 고정
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  cacheComponents: true,
  partialPrefetching: true,
  // 1차 메뉴 주소만 친 경우 첫 하위 페이지로 보낸다
  async redirects() {
    return [
      { source: "/team", destination: "/team/players", permanent: false },
      { source: "/match", destination: "/match/schedule", permanent: false },
    ];
  },
};

export default nextConfig;
