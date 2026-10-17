import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewsGallery } from "@/components/news/NewsGallery";
import { VideoEmbed } from "@/components/news/VideoEmbed";
import { FitImage } from "@/components/ui/FitImage";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { formatPostDate } from "@/lib/format";
import { articleImage } from "@/lib/og";
import { sitePreviewMeta } from "@/lib/og-metadata";
import { nonEmptyParams, toNewsCategory } from "@/lib/params";
import { getNews, getNewsPost } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

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

  return (
    <>
      <PageHeader title={NEWS_CATEGORY_LABEL[post.category]} current={`/news/${post.category}`} />
      <article className={`container ${styles.body}`}>
        <header>
          <h2 className={styles.h2}>{post.title}</h2>
          <p className={styles.note}>{formatPostDate(post.date)}</p>
        </header>
        {/* 구단영상은 영상을 맨 위에서 재생, 사진은 그 아래 (D-035) */}
        {post.videoUrl && <VideoEmbed url={post.videoUrl} title={post.title} />}
        {/* BR-015: 상세 사진이 있으면 사진 전부, 없으면 썸네일 한 장 (영상 글은 썸네일을 다시 보이지 않는다) */}
        {post.images.length > 0 ? (
          <NewsGallery images={post.images} title={post.title} />
        ) : (
          post.thumbnail &&
          !post.videoUrl && (
            <div className={styles.figure}>
              <FitImage src={post.thumbnail} sizes="(max-width: 1200px) 100vw, 1200px" />
            </div>
          )
        )}
        <div className={styles.lead}>
          {post.body.map((p) => (
            <p key={p}>
              <LinkifiedText text={p} />
            </p>
          ))}
        </div>
        <p>
          <Link href={`/news/${post.category}`} className={styles.button}>
            목록
          </Link>
        </p>
      </article>
    </>
  );
}
