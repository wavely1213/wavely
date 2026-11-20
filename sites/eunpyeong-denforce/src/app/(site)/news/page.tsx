import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewsBanner } from "@/components/news/NewsBanner";
import { toNewsCardPost } from "@/components/news/NewsCard";
import { NewsMoreGrid } from "@/components/news/NewsMoreGrid";
import { pickBanner } from "@/lib/news";
import { pageMetadata } from "@/lib/page-meta";
import { getNews } from "@/lib/repo";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("구단소식", "/news");
}

export default async function NewsPage() {
  const posts = await getNews();
  const banner = pickBanner(posts);
  // 배너에 나온 글은 바로 아래 목록에서 빼서 같은 글이 두 번 보이지 않게 (소유자 지시 2026-10-17)
  const inBanner = new Set(banner.map((p) => p.id));
  return (
    <>
      <PageHeader title="구단소식" current="/news" />
      <div className="container">
        {/* 맨 위 메인 소식 슬라이드 — 관리자 '메인 배너' 고정 글, 없으면 최근 소식(이적·작별 제외) (D-035) */}
        <NewsBanner posts={banner} />
        {/* 처음 12개, '더 보기'로 12개씩 더 */}
        <NewsMoreGrid posts={posts.filter((p) => !inBanner.has(p.id)).map(toNewsCardPost)} />
      </div>
    </>
  );
}
