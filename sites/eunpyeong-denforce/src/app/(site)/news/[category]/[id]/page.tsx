import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewsGallery } from "@/components/news/NewsGallery";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { formatPostDate } from "@/lib/format";
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
  return { title: post?.title ?? "구단소식" };
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
        {/* BR-015: 상세 사진이 있으면 사진 전부, 없으면 썸네일 한 장 */}
        {post.images.length > 0 ? (
          <NewsGallery images={post.images} title={post.title} />
        ) : (
          post.thumbnail && (
            <div className={styles.figure}>
              <Image src={post.thumbnail} alt="" fill sizes="(max-width: 1200px) 100vw, 1200px" />
            </div>
          )
        )}
        <div className={styles.lead}>
          {post.body.map((p) => (
            <p key={p}>{p}</p>
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
