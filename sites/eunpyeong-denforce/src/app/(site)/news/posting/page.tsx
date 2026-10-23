import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PostingBoard } from "@/components/posting/PostingBoard";
import { pageMetadata } from "@/lib/page-meta";
import { getPostings, getSiteContent } from "@/lib/repo";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("포스팅", "/news/posting");
}

/** 바깥 글 모음 — 카드를 누르면 원문으로 간다 (D-022) */
export default async function PostingPage() {
  const [postings, content] = await Promise.all([getPostings(), getSiteContent()]);
  return (
    <>
      <PageHeader title="포스팅" current="/news/posting" />
      <div className="container">
        <PostingBoard postings={postings} emptyText={content["posting.empty"]} />
      </div>
    </>
  );
}
