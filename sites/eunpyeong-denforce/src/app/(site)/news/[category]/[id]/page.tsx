import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { newsHref } from "@/components/news/NewsCard";
import { NewsGallery } from "@/components/news/NewsGallery";
import { ShareButton } from "@/components/news/ShareButton";
import { VideoEmbed } from "@/components/news/VideoEmbed";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { formatPostDate } from "@/lib/format";
import { adjacentPosts, isProfileBlock } from "@/lib/news";
import { articleImage } from "@/lib/og";
import { sitePreviewMeta } from "@/lib/og-metadata";
import { nonEmptyParams, toNewsCategory } from "@/lib/params";
import { getNews, getNewsPost } from "@/lib/repo";
import article from "./article.module.css";

export async function generateStaticParams() {
  return nonEmptyParams(
    (await getNews()).map((p) => ({ category: p.category, id: p.id })),
    { category: "notice", id: "none" },
  );
}

async function load(params: PageProps<"/news/[category]/[id]">["params"]) {
  const { category, id } = await params;
  const c = toNewsCategory(category);
  return c ? getNewsPost(c, id) : undefined;
}

export async function generateMetadata({ params }: PageProps<"/news/[category]/[id]">): Promise<Metadata> {
  const post = await load(params);
  if (!post) return { title: "구단소식" };
  // 링크 미리보기 = 이 글의 사진·제목·요약 (사진 없으면 사이트 이미지) — D-038
  const description = post.summary || undefined;
  return {
    title: post.title,
    ...(description ? { description } : {}),
    ...(await sitePreviewMeta({
      type: "article",
      imageUrl: articleImage(post),
      imageAlt: post.title,
      description,
      publishedTime: post.date,
    })),
  };
}

export default async function NewsPostPage({ params }: PageProps<"/news/[category]/[id]">) {
  const post = await load(params);
  if (!post) notFound();
  // 같은 분류 안에서 목록 순서(최근 글 먼저) 기준 — 이전 글 = 더 오래된 글, 다음 글 = 더 새 글
  const { older, newer } = adjacentPosts(await getNews(post.category), post.id);

  const label = NEWS_CATEGORY_LABEL[post.category];
  // 기사 대표 사진: 상세 사진이 있으면 전부, 없으면 썸네일 한 장 (BR-015, 영상 글은 썸네일을 다시 보이지 않는다) — 모두 '크게 보기'
  const photos = post.images.length > 0 ? post.images : post.thumbnail && !post.videoUrl ? [post.thumbnail] : [];

  return (
    <>
      {/* 이 페이지의 큰 제목은 글 제목(h1) — 분류 이름은 작게, 분류 탭은 그대로 */}
      <PageHeader title={label} current={`/news/${post.category}`} compact />
      <article className={`container ${article.article}`}>
        <header className={article.head}>
          <h1 className={article.title}>{post.title}</h1>
          <div className={article.meta}>
            <span className={article.category}>{label}</span>
            {post.date && <span className={article.date}>{formatPostDate(post.date)}</span>}
            <span className={article.share}>
              <ShareButton title={post.title} />
            </span>
          </div>
        </header>
        {/* 구단영상은 영상을 맨 위에서 재생, 사진은 그 아래 (D-035) */}
        {post.videoUrl && <VideoEmbed url={post.videoUrl} title={post.title} />}
        {photos.length > 0 && <NewsGallery images={photos} title={post.title} />}
        <div className={article.body}>
          {post.body.map((p) =>
            isProfileBlock(p) ? (
              <p key={p} className={article.profile}>
                <LinkifiedText text={p} />
              </p>
            ) : (
              <p key={p}>
                <LinkifiedText text={p} />
              </p>
            ),
          )}
        </div>
        <footer className={article.foot}>
          {/* 다음 글(더 새 글) → 이전 글(더 오래된 글), 없으면 '없습니다' (리디자인 3차 기사 상세) */}
          <nav aria-label="다음 글 / 이전 글">
            <ul className={article.pager}>
              <li>
                <span className={article.pagerLabel}>다음 글</span>
                {newer ? (
                  <Link href={newsHref(newer)} className={article.pagerLink}>
                    <span className="sr-only">다음 글: </span>
                    {newer.title}
                  </Link>
                ) : (
                  <span className={article.pagerEmpty}>다음 글이 없습니다</span>
                )}
              </li>
              <li>
                <span className={article.pagerLabel}>이전 글</span>
                {older ? (
                  <Link href={newsHref(older)} className={article.pagerLink}>
                    <span className="sr-only">이전 글: </span>
                    {older.title}
                  </Link>
                ) : (
                  <span className={article.pagerEmpty}>이전 글이 없습니다</span>
                )}
              </li>
            </ul>
          </nav>
          <p className={article.listWrap}>
            <Link href={`/news/${post.category}`} className={article.list}>
              목록
            </Link>
          </p>
        </footer>
      </article>
    </>
  );
}
