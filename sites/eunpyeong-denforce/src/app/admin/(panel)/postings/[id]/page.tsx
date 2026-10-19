import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import { canEditPost, PUBLISHED_LOCKED_MESSAGE, STAFF_ROLES } from "@/lib/admin/roles";
import type { PostingRow } from "@/lib/data/rows";
import { deletePosting, updatePosting } from "../actions";
import { PostingForm } from "../PostingForm";

export const metadata: Metadata = { title: "포스팅 수정" };

export default function EditPostingPage({ params }: PageProps<"/admin/postings/[id]">) {
  return (
    <>
      <PageTitle title="포스팅 수정" back={{ href: "/admin/postings", label: "포스팅 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/postings/[id]">["params"] }) {
  const { supabase, perms } = await requireAdminPage(STAFF_ROLES);
  const { id } = await params;
  const { data } = await supabase.from("postings").select("*").eq("id", id).maybeSingle<PostingRow>();
  if (!data) notFound();
  // 공개된 글은 '공개된 글 고치기' 권한이 없으면 고치거나 지울 수 없다 (미디어 계정, D-057)
  if (!canEditPost(perms, data.published)) {
    return <p className={`${styles.panel} ${styles.empty}`}>{PUBLISHED_LOCKED_MESSAGE}</p>;
  }

  return (
    <>
      <PostingForm action={updatePosting.bind(null, id)} initial={data} perms={perms} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deletePosting.bind(null, id)} label="포스팅 삭제" />
      </div>
    </>
  );
}
