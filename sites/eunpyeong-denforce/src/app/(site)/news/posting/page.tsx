import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PostingBoard } from "@/components/posting/PostingBoard";
import { getPostings } from "@/lib/repo";

export const metadata: Metadata = {
  title: "포스팅",
  description: "서울은평 덴포스를 다룬 구단 글·기사·팬 포스팅 모음",
};

/** 바깥 글 모음 — 카드를 누르면 원문으로 간다 (D-022) */
export default async function PostingPage() {
  const postings = await getPostings();
  return (
    <>
      <PageHeader title="포스팅" current="/news/posting" />
      <div className="container">
        <PostingBoard postings={postings} />
      </div>
    </>
  );
}
