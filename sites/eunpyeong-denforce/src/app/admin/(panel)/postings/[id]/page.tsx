import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import { editBlockReason, STAFF_ROLES } from "@/lib/admin/roles";
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
  const ctx = await requireAdminPage(STAFF_ROLES);
  const { supabase, perms } = ctx;
  const { id } = await params;
  const { data } = await supabase.from("postings").select("*").eq("id", id).maybeSingle<PostingRow>();
  if (!data) notFound();
  // 미디어 계정은 자기 글만, 공개된 글은 '공개된 글 고치기' 권한이 있어야 고치거나 지운다 (D-057)
  const blocked = editBlockReason(ctx, data);
  if (blocked) return <p className={`${styles.panel} ${styles.empty}`}>{blocked}</p>;

  return (
    <>
      <PostingForm action={updatePosting.bind(null, id)} initial={data} perms={perms} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deletePosting.bind(null, id)} label="포스팅 삭제" />
      </div>
    </>
  );
}
