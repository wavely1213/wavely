import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { createPosting } from "../actions";
import { PostingForm } from "../PostingForm";

export const metadata: Metadata = { title: "포스팅 추가" };

export default function NewPostingPage() {
  return (
    <>
      <PageTitle title="포스팅 추가" back={{ href: "/admin/postings", label: "포스팅 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  await requireAdminPage();
  return <PostingForm action={createPosting} />;
}
