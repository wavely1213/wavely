import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { PostingBoard } from "@/components/posting/PostingBoard";
import { getPostings } from "@/lib/repo";
import styles from "@/components/posting/PostingBoard.module.css";

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
        <p className={styles.intro}>
          서울은평 덴포스(서울은평FS·나인티플러스·ZD스포츠 시절, 풋볼아카데미 포함)를 다룬 구단 글과 기사, 팬들이 블로그·카페·유튜브에 남긴
          글을 모았습니다. 글을 누르면 원문으로 이동합니다.
        </p>
        <PostingBoard postings={postings} />
      </div>
    </>
  );
}
