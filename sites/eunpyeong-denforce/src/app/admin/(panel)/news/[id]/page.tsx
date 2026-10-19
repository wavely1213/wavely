import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import { canEditPost, PUBLISHED_LOCKED_MESSAGE, STAFF_ROLES } from "@/lib/admin/roles";
import type { NewsRow } from "@/lib/data/rows";
import { deleteNews, updateNews } from "../actions";
import { NewsForm } from "../NewsForm";

export const metadata: Metadata = { title: "소식 수정" };

// 라우트 타입(.next/types)이 빌드 때 생성되므로 params 타입은 직접 적는다 (PageProps 와 호환)
type Params = Promise<{ id: string }>;

export default function EditNewsPage({ params }: { params: Params }) {
  return (
    <>
      <PageTitle title="소식 수정" back={{ href: "/admin/news", label: "구단소식 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: Params }) {
  const { supabase, perms } = await requireAdminPage(STAFF_ROLES);
  const { id } = await params;
  const { data } = await supabase.from("news_posts").select("*").eq("id", id).maybeSingle<NewsRow>();
  if (!data) notFound();
  // 공개된 글은 '공개된 글 고치기' 권한이 없으면 고치거나 지울 수 없다 (미디어 계정, D-057)
  if (!canEditPost(perms, data.published)) {
    return <p className={`${styles.panel} ${styles.empty}`}>{PUBLISHED_LOCKED_MESSAGE}</p>;
  }

  return (
    <>
      <NewsForm action={updateNews.bind(null, id)} initial={data} perms={perms} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deleteNews.bind(null, id)} label="소식 삭제" />
      </div>
    </>
  );
}
