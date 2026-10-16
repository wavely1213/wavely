import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewsBanner } from "@/components/news/NewsBanner";
import { NewsGrid } from "@/components/news/NewsCard";
import { pickBanner } from "@/lib/news";
import { getNews } from "@/lib/repo";

export const metadata: Metadata = { title: "구단소식" };

export default async function NewsPage() {
  const posts = await getNews();
  return (
    <>
      <PageHeader title="구단소식" current="/news" />
      <div className="container">
        {/* 맨 위 메인 소식 슬라이드 — 관리자 '메인 배너' 고정 글, 없으면 최근 소식(이적·작별 제외) (D-035) */}
        <NewsBanner posts={pickBanner(posts)} />
        <NewsGrid posts={posts} />
      </div>
    </>
  );
}
