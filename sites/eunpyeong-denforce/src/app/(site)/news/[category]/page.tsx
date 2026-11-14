import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { toNewsCardPost } from "@/components/news/NewsCard";
import { HighlightBlock, HighlightRow } from "@/components/news/HighlightCard";
import { NewsMoreGrid } from "@/components/news/NewsMoreGrid";
import { Section } from "@/components/ui/Section";
import { buttonClass } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { matchHighlights } from "@/lib/highlights";
import { newsCategoryDescription } from "@/lib/page-descriptions";
import { descriptionInput } from "@/lib/page-meta";
import { NEWS_CATEGORIES, toNewsCategory } from "@/lib/params";
import { getFinishedMatches, getNews, getSiteContent } from "@/lib/repo";

export function generateStaticParams() {
  return NEWS_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/news/[category]">): Promise<Metadata> {
  const category = toNewsCategory((await params).category);
  if (!category) return { title: "구단소식" };
  const { club } = await descriptionInput();
  return { title: NEWS_CATEGORY_LABEL[category], description: newsCategoryDescription(club, category) };
}

export default async function NewsCategoryPage({ params }: PageProps<"/news/[category]">) {
  const category = toNewsCategory((await params).category);
  if (!category) notFound();
  const [posts, content, finished] = await Promise.all([getNews(category), getSiteContent(), category === "video" ? getFinishedMatches() : []]);
  // 구단영상 맨 위 '경기 하이라이트' (D-091 H1) — 하이라이트 있는 종료 경기 전부, 최신순 (한 시즌 약 15~20개라 더 보기 없이)
  const highlights = category === "video" ? matchHighlights(finished, content["site.name"]) : [];

  return (
    <>
      <PageHeader title={NEWS_CATEGORY_LABEL[category]} current={`/news/${category}`} />
      <div className="container">
        {highlights.length > 0 && (
          <HighlightBlock id="highlights">
            <Section title="경기 하이라이트" contained={false}>
              <HighlightRow items={highlights} />
            </Section>
          </HighlightBlock>
        )}
        {/* 구단영상은 세로 영상(릴스) 카드를 한 줄에 여럿 (D-061) */}
        {posts.length > 0 ? (
          <NewsMoreGrid posts={posts.map(toNewsCardPost)} vertical={category === "video"} />
        ) : (
          // 분류에 글이 없으면 안내 + 전체 소식으로 (디자인 UX 상태 표 208:21724)
          <Placeholder label={content["news.empty"]}>
            <Link href="/news" className={buttonClass("secondary")}>
              전체 보기 <span aria-hidden="true">→</span>
            </Link>
          </Placeholder>
        )}
      </div>
    </>
  );
}
