import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { getNews, getPastLeagues, getPlayers } from "@/lib/repo";
import { sitemapEntries } from "@/lib/seo";

// 사이트맵 — 네이버 서치어드바이저·구글에 제출 (D-027)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [news, players, past] = await Promise.all([getNews(), getPlayers(), getPastLeagues()]);
  return sitemapEntries(SITE.url, { news, players, seasons: past.map((l) => l.slug) });
}
