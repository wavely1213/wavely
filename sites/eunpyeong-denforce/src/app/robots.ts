import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

// 검색엔진 수집 규칙 — 관리자 화면은 막고 사이트맵 위치를 알린다 (D-027)
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/admin" }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
