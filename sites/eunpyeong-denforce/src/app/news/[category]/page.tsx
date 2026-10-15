import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewsGrid } from "@/components/news/NewsCard";
import { Placeholder } from "@/components/ui/Placeholder";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { NEWS_CATEGORIES, toNewsCategory } from "@/lib/params";
import { getNews } from "@/lib/repo";

export function generateStaticParams() {
  return NEWS_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps<"/news/[category]">): Promise<Metadata> {
  const category = toNewsCategory((await params).category);
  return { title: category ? NEWS_CATEGORY_LABEL[category] : "구단소식" };
}

export default async function NewsCategoryPage({ params }: PageProps<"/news/[category]">) {
  const category = toNewsCategory((await params).category);
  if (!category) notFound();
  const posts = await getNews(category);

  return (
    <>
      <PageHeader title={NEWS_CATEGORY_LABEL[category]} current={`/news/${category}`} />
      <div className="container">
        {posts.length > 0 ? <NewsGrid posts={posts} /> : <Placeholder label="게시물이 없습니다." />}
      </div>
    </>
  );
}
