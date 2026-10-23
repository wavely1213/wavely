import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { toNewsCardPost } from "@/components/news/NewsCard";
import { NewsMoreGrid } from "@/components/news/NewsMoreGrid";
import { Placeholder } from "@/components/ui/Placeholder";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { newsCategoryDescription } from "@/lib/page-descriptions";
import { descriptionInput } from "@/lib/page-meta";
import { NEWS_CATEGORIES, toNewsCategory } from "@/lib/params";
import { getNews, getSiteContent } from "@/lib/repo";

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
  const [posts, content] = await Promise.all([getNews(category), getSiteContent()]);

  return (
    <>
      <PageHeader title={NEWS_CATEGORY_LABEL[category]} current={`/news/${category}`} />
      <div className="container">
        {/* 구단영상은 세로 영상(릴스) 카드를 한 줄에 여럿 (D-061) */}
        {posts.length > 0 ? (
          <NewsMoreGrid posts={posts.map(toNewsCardPost)} vertical={category === "video"} />
        ) : (
          <Placeholder label={content["news.empty"]} />
        )}
      </div>
    </>
  );
}
