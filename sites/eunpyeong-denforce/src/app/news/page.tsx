import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewsGrid } from "@/components/news/NewsCard";
import { getNews } from "@/lib/repo";

export const metadata: Metadata = { title: "구단소식" };

export default async function NewsPage() {
  const posts = await getNews();
  return (
    <>
      <PageHeader title="구단소식" current="/news" />
      <div className="container">
        <NewsGrid posts={posts} />
      </div>
    </>
  );
}
