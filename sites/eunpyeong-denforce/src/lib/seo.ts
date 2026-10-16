// 검색 등록용 — 사이트맵 주소 목록, 구단 구조화 데이터(JSON-LD). 순수 함수 (테스트: seo.test.ts, D-027)
import type { NewsPost, Player } from "@/types";

/** 사이트맵에 넣는 고정 페이지 (관리자·개인정보처리방침 제외) */
export const STATIC_PATHS = [
  "/",
  "/club",
  "/club/history",
  "/club/emblem",
  "/club/location",
  "/news",
  "/news/notice",
  "/news/news",
  "/news/photo",
  "/news/video",
  "/news/posting",
  "/team/players",
  "/team/staff",
  "/match/schedule",
  "/match/results",
  "/match/standings",
  "/sponsors",
  "/contact",
  "/sitemap",
] as const;

export type SitemapEntry = { url: string; lastModified?: string };

/** 고정 페이지 + 구단소식 글 + 선수 + 지난 리그 시즌 */
export function sitemapEntries(
  base: string,
  data: { news: Pick<NewsPost, "category" | "id" | "date">[]; players: Pick<Player, "slug">[]; seasons: string[] },
): SitemapEntry[] {
  const root = base.replace(/\/$/, "");
  return [
    ...STATIC_PATHS.map((p) => ({ url: root + (p === "/" ? "" : p) })),
    ...data.news.map((n) => ({
      url: `${root}/news/${n.category}/${n.id}`,
      // 날짜를 모르는 글('2026' 등)은 lastModified 를 넣지 않는다
      ...(/^\d{4}-\d{2}-\d{2}$/.test(n.date) ? { lastModified: n.date } : {}),
    })),
    ...data.players.map((p) => ({ url: `${root}/team/players/${p.slug}` })),
    ...data.seasons.map((slug) => ({ url: `${root}/match/standings/${slug}` })),
  ];
}

export type ClubJsonLdInput = {
  name: string;
  alternateNames: readonly string[];
  url: string;
  logo: string;
  foundingDate: string;
  venueName: string;
  venueAddress: string | null;
  sameAs: string[];
};

/** 구단 정보 (schema.org SportsTeam) — 검색엔진이 공식 홈페이지·다른 이름·SNS 를 연결하도록 */
export function clubJsonLd(c: ClubJsonLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: c.name,
    alternateName: [...c.alternateNames],
    url: c.url,
    logo: c.logo,
    sport: "Futsal",
    foundingDate: c.foundingDate,
    memberOf: { "@type": "SportsOrganization", name: "FK리그 (한국풋살연맹)" },
    location: {
      "@type": "Place",
      name: c.venueName,
      ...(c.venueAddress ? { address: c.venueAddress } : {}),
    },
    ...(c.sameAs.length > 0 ? { sameAs: c.sameAs } : {}),
  };
}

/** <script type="application/ld+json"> 에 넣을 문자열 — '<' 를 이스케이프해 스크립트 태그가 끊기지 않게 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
