import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { HomeColumns } from "@/components/home/HomeColumns";
import { NewsTabs } from "@/components/home/NewsTabs";
import { PlayersPreview } from "@/components/home/PlayersPreview";
import { QuickLinks } from "@/components/home/QuickLinks";
import { SponsorMarquee } from "@/components/home/SponsorMarquee";
import { StandingsWidget } from "@/components/home/StandingsWidget";
import { InstagramGrid, InstagramReels } from "@/components/home/InstagramGrid";
import { MatchBand } from "@/components/home/MatchBand";
import { HighlightBlock, HighlightRow } from "@/components/news/HighlightCard";
import { matchHighlights } from "@/lib/highlights";
import { homeReels } from "@/lib/reels";
import { MatchStrip } from "@/components/home/MatchStrip";
import { MatchdayPopup } from "@/components/home/MatchdayPopup";
import { posterWindows } from "@/lib/matchday";
import { Section } from "@/components/ui/Section";
import { SITE } from "@/config/site";
import { instagramHandle, snsLinks } from "@/lib/club";
import { contentLines } from "@/lib/content/values";
import { heroContent } from "@/lib/content/views";
import {
  getClubSettings,
  getContentList,
  getFinishedMatches,
  getNews,
  getNextHomeMatch,
  getPlayersByPosition,
  getPostings,
  getSiteContent,
  getSponsors,
  getStandings,
  getUpcomingMatches,
  isLiveData,
} from "@/lib/repo";
import { homeMatchItems } from "@/lib/match";
import { sitePreviewMeta } from "@/lib/og-metadata";
import { clubJsonLd, jsonLdString } from "@/lib/seo";
import { instagramTiles } from "@/lib/postings";
import { sortByTier } from "@/lib/sponsors";

/** 홈페이지 주소 미리보기 제목·설명 — 관리자 화면에서 정한 문구, 비우면 사이트 이름·설명 (D-038) */
export async function generateMetadata(): Promise<Metadata> {
  const { ogTitle, ogDescription } = await getClubSettings();
  return sitePreviewMeta({ title: ogTitle, description: ogDescription });
}

// 메인 섹션 순서 (리디자인 D-067): 히어로(+ 다음 홈경기) → 경기 띠 → 스폰서 띠(D-029) → [구단 소식 | 리그 순위 위젯]
// → 선수단(검정 면) → INSTAGRAM → 바로가기. 휴대폰은 리그 순위가 구단 소식보다 먼저(HomeColumns). 빈 섹션은 숨긴다.
export default async function HomePage() {
  const [nextHome, finished, upcoming, news, groups, sponsors, settings, standings, c, quickLinks, postings] = await Promise.all([
    getNextHomeMatch(),
    getFinishedMatches(),
    getUpcomingMatches(),
    getNews(),
    getPlayersByPosition(),
    getSponsors(),
    getClubSettings(),
    getStandings(),
    getSiteContent(),
    getContentList("home.quicklinks"),
    getPostings(),
  ]);

  // 검색엔진용 구단 정보 — 공식 홈페이지·다른 이름·SNS 연결 (D-027)
  const jsonLd = clubJsonLd({
    name: c["site.name"],
    alternateNames: [c["site.nameEn"], ...contentLines(c["site.alternateNames"])],
    url: SITE.url,
    logo: `${SITE.url}${SITE.emblem}`,
    foundingDate: c["site.foundedDate"],
    venueName: c["site.homeVenue"],
    venueAddress: settings.venueAddress,
    sameAs: snsLinks(settings).map((s) => s.href),
  });

  const matchItems = homeMatchItems(finished, upcoming);
  // 은평 경기 하이라이트 최신 4개 (D-091) — 없으면 줄째 숨김
  const highlights = matchHighlights(finished, c["site.name"], 4);
  // INSTAGRAM 게시물 아래 릴스 6칸 (D-095) — 구단영상 중 인스타 릴스
  const reels = homeReels(news);
  const ourName = c["site.name"];
  // 매치데이 / FULL TIME 포스터 팝업 (D-096) — 포스터가 있는 경기의 창. 지금 보일지는 브라우저가 정한다
  const popups = posterWindows([...upcoming, ...finished]);
  const instagram = instagramTiles(postings);
  const handle = instagramHandle(settings.instagramUrl);

  return (
    <>
      {popups.length > 0 && <MatchdayPopup windows={popups} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <Hero nextHome={nextHome} content={heroContent(c)} ourName={ourName} />

      {matchItems.length > 0 && (
        <MatchBand title={c["home.section.matches"]}>
          <MatchStrip items={matchItems} ourName={ourName} />
        </MatchBand>
      )}

      {highlights.length > 0 && (
        <HighlightBlock>
          <Section title={c["home.section.highlights"]} more={{ href: "/news/video#highlights" }}>
            <HighlightRow items={highlights} />
          </Section>
        </HighlightBlock>
      )}

      {sponsors.length > 0 && <SponsorMarquee sponsors={sortByTier(sponsors)} />}

      <HomeColumns
        main={
          <Section title={c["home.section.news"]} contained={false} more={{ href: "/news" }}>
            <NewsTabs posts={news} />
          </Section>
        }
        aside={standings.length > 0 ? <StandingsWidget rows={standings} title={c["home.section.standings"]} live={isLiveData()} /> : null}
      />

      <Section title={c["home.section.players"]} band="black" more={{ href: "/team/players" }}>
        <PlayersPreview groups={groups} />
      </Section>

      {instagram.length > 0 && (
        <Section title="INSTAGRAM" more={settings.instagramUrl && handle ? { href: settings.instagramUrl, label: handle, external: true } : undefined}>
          <InstagramGrid posts={instagram} />
          {reels.length > 0 && <InstagramReels reels={reels} />}
        </Section>
      )}

      {quickLinks.length > 0 && (
        <Section title={c["home.section.quicklinks"]}>
          <QuickLinks items={quickLinks} />
        </Section>
      )}
    </>
  );
}
