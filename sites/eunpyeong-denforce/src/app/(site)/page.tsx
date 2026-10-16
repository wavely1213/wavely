import { Hero } from "@/components/home/Hero";
import { HomeColumns } from "@/components/home/HomeColumns";
import { NewsTabs } from "@/components/home/NewsTabs";
import { PlayersPreview } from "@/components/home/PlayersPreview";
import { QuickLinks } from "@/components/home/QuickLinks";
import { SponsorMarquee } from "@/components/home/SponsorMarquee";
import { StandingsWidget } from "@/components/home/StandingsWidget";
import { MatchCards } from "@/components/match/MatchCard";
import { Section } from "@/components/ui/Section";
import { SITE } from "@/config/site";
import { snsLinks } from "@/lib/club";
import {
  getClubSettings,
  getFinishedMatches,
  getNews,
  getNextHomeMatch,
  getPlayersByPosition,
  getSponsors,
  getStandings,
  getUpcomingMatches,
} from "@/lib/repo";
import { homeMatchItems } from "@/lib/match";
import { clubJsonLd, jsonLdString } from "@/lib/seo";

// 메인 섹션 순서: 히어로(다음 홈경기) → 스폰서 띠(한 줄 자동 흐름, D-029) → [경기 → 구단 소식 | 오른쪽 리그 순위 위젯] (D-034) → 선수단 → 바로가기
// 구단 영상 섹션은 영상 콘텐츠가 생기면 추가한다 (빈 섹션은 노출하지 않음).
export default async function HomePage() {
  const [nextHome, finished, upcoming, news, groups, sponsors, settings, standings] = await Promise.all([
    getNextHomeMatch(),
    getFinishedMatches(),
    getUpcomingMatches(),
    getNews(),
    getPlayersByPosition(),
    getSponsors(),
    getClubSettings(),
    getStandings(),
  ]);

  // 검색엔진용 구단 정보 — 공식 홈페이지·다른 이름·SNS 연결 (D-027)
  const jsonLd = clubJsonLd({
    name: SITE.name,
    alternateNames: [SITE.nameEn, ...SITE.alternateNames],
    url: SITE.url,
    logo: `${SITE.url}${SITE.emblem}`,
    foundingDate: SITE.foundedDate,
    venueName: SITE.homeVenue,
    venueAddress: settings.venueAddress,
    sameAs: snsLinks(settings).map((s) => s.href),
  });

  const matchItems = homeMatchItems(finished, upcoming);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <Hero nextHome={nextHome} />
      {sponsors.length > 0 && <SponsorMarquee sponsors={sponsors} />}

      <HomeColumns
        main={
          <>
            {matchItems.length > 0 && (
              <Section title="경기" contained={false} more={{ href: upcoming.length > 0 ? "/match/schedule" : "/match/results" }}>
                <MatchCards items={matchItems} />
              </Section>
            )}
            <Section title="구단 소식" contained={false} more={{ href: "/news" }}>
              <NewsTabs posts={news} limit={6} columns={3} />
            </Section>
          </>
        }
        aside={standings.length > 0 ? <StandingsWidget rows={standings} /> : null}
      />

      <Section title="선수단" more={{ href: "/team/players" }}>
        <PlayersPreview groups={groups} />
      </Section>

      <Section title="바로가기">
        <QuickLinks />
      </Section>
    </>
  );
}
