// 피그마 포스터용 공개 JSON — GET /api/figma/feed (D-066, docs/FIGMA_SYNC.md 약속 B)
// 피그마 플러그인 '포스터 채우기'가 읽는다. 홈페이지에 이미 공개된 정보만 (lib/figma-feed.ts).
// 캐시 1분: 데이터는 repo 의 'use cache'(cacheLife minutes)를 그대로 쓰고, 응답도 1분 캐시.
// 플러그인 화면은 출처가 'null' 인 iframe 이라 CORS 를 모두 허용한다 (공개 읽기 전용 데이터, 쿠키 없음).
import { cacheLife } from "next/cache";
import { SITE } from "@/config/site";
import { buildFigmaFeed } from "@/lib/figma-feed";
import { getMatches, getNews, getPlayers, getSiteContent, getSponsors, getStaff } from "@/lib/repo";

async function loadFeed() {
  "use cache";
  cacheLife("minutes");
  const [matches, news, players, staff, sponsors, c] = await Promise.all([
    getMatches(),
    getNews(),
    getPlayers(),
    getStaff(),
    getSponsors(),
    getSiteContent(),
  ]);
  return buildFigmaFeed({
    now: new Date(),
    siteUrl: SITE.url,
    clubName: c["site.name"],
    clubNameEn: c["site.nameEn"],
    emblem: SITE.emblem,
    matches,
    news,
    players,
    staff,
    sponsors,
  });
}

export async function GET() {
  return Response.json(await loadFeed(), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=60",
    },
  });
}
