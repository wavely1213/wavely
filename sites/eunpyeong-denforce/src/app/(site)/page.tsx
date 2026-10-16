import { Hero } from "@/components/home/Hero";
import { NewsTabs } from "@/components/home/NewsTabs";
import { PlayersPreview } from "@/components/home/PlayersPreview";
import { QuickLinks } from "@/components/home/QuickLinks";
import { SponsorStrip } from "@/components/home/SponsorStrip";
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
  getUpcomingMatches,
} from "@/lib/repo";
import { clubJsonLd, jsonLdString } from "@/lib/seo";
import type { Match } from "@/types";

// 메인 섹션 순서: 히어로(다음 홈경기) → 경기 → 구단 소식 → 선수단 → 바로가기 → 스폰서
// 구단 영상 섹션은 영상 콘텐츠가 생기면 추가한다 (빈 섹션은 노출하지 않음).
export default async function HomePage() {
  const [nextHome, finished, upcoming, news, groups, sponsors, settings] = await Promise.all([
    getNextHomeMatch(),
    getFinishedMatches(),
    getUpcomingMatches(),
    getNews(),
    getPlayersByPosition(),
    getSponsors(),
    getClubSettings(),
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

  // 예정 경기가 있으면 지난 1 + 예정 2, 시즌 휴식기(예정 없음)에는 최근 결과 3
  const matchItems: Array<{ match: Match; label: string }> =
    upcoming.length > 0
      ? [
          ...finished.slice(0, 1).map((match) => ({ match, label: "지난 경기" })),
          ...upcoming.slice(0, 2).map((match, i) => ({ match, label: i === 0 ? "다음 경기" : "예정" })),
        ]
      : finished.slice(0, 3).map((match) => ({ match, label: "지난 경기" }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <Hero nextHome={nextHome} />

      {matchItems.length > 0 && (
        <Section title="경기" more={{ href: upcoming.length > 0 ? "/match/schedule" : "/match/results" }}>
          <MatchCards items={matchItems} />
        </Section>
      )}

      <Section title="구단 소식" more={{ href: "/news" }}>
        <NewsTabs posts={news} />
      </Section>

      <Section title="선수단" more={{ href: "/team/players" }}>
        <PlayersPreview groups={groups} />
      </Section>

      <Section title="바로가기">
        <QuickLinks />
      </Section>

      {sponsors.length > 0 && (
        <Section title="스폰서" more={{ href: "/sponsors" }}>
          <SponsorStrip sponsors={sponsors} />
        </Section>
      )}
    </>
  );
}
