import { Hero } from "@/components/home/Hero";
import { NewsTabs } from "@/components/home/NewsTabs";
import { PlayersPreview } from "@/components/home/PlayersPreview";
import { QuickLinks } from "@/components/home/QuickLinks";
import { SponsorStrip } from "@/components/home/SponsorStrip";
import { MatchRow } from "@/components/match/MatchRow";
import { Placeholder } from "@/components/ui/Placeholder";
import { Section } from "@/components/ui/Section";
import {
  getFinishedMatches,
  getNews,
  getNextHomeMatch,
  getPlayersByPosition,
  getSponsors,
  getUpcomingMatches,
} from "@/lib/repo";

// 메인 섹션 순서: 다음 홈경기 → 경기 결과·일정 → 구단 소식 → 선수단 → 바로가기 → 영상 → 스폰서
export default async function HomePage() {
  const [nextHome, finished, upcoming, news, groups, sponsors] = await Promise.all([
    getNextHomeMatch(),
    getFinishedMatches(),
    getUpcomingMatches(),
    getNews(),
    getPlayersByPosition(),
    getSponsors(),
  ]);
  const matches = [...finished.slice(0, 1), ...upcoming.slice(0, 2)];

  return (
    <>
      <Hero nextHome={nextHome} />

      <Section title="경기 일정·결과" more={{ href: "/match/schedule" }}>
        {matches.length > 0 ? (
          <ul>
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </ul>
        ) : (
          <Placeholder label="등록된 경기가 없습니다." />
        )}
      </Section>

      <Section title="구단 소식" tone="soft" more={{ href: "/news" }}>
        <NewsTabs posts={news} />
      </Section>

      <Section title="선수단" more={{ href: "/team/players" }}>
        <PlayersPreview groups={groups} />
      </Section>

      <Section title="바로가기" tone="dark">
        <QuickLinks />
      </Section>

      <Section title="구단 영상" more={{ href: "/news/video" }}>
        <Placeholder label="유튜브 채널 연동 예정" ratio="16 / 5" />
      </Section>

      <Section title="스폰서" tone="soft" more={{ href: "/sponsors" }}>
        <SponsorStrip sponsors={sponsors} />
      </Section>
    </>
  );
}
