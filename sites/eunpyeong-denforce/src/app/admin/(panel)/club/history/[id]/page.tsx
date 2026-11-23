import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { HistoryRow } from "@/lib/data/rows";
import { deleteHistory, updateHistory } from "../actions";
import { HistoryForm } from "../HistoryForm";

export const metadata: Metadata = { title: "연혁 수정" };

// 라우트 타입(PageProps<"/admin/club/history/[id]">)은 빌드 때 생성되므로 params 타입을 직접 적는다
type Params = Promise<{ id: string }>;

export default function EditHistoryPage({ params }: { params: Params }) {
  return (
    <>
      <PageTitle title="연혁 수정" back={{ href: "/admin/club", label: "구단정보" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: Params }) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  const { data } = await supabase
    .from("history_items")
    .select("id, year, text, sort_order")
    .eq("id", id)
    .maybeSingle<HistoryRow>();
  if (!data) notFound();

  return (
    <>
      <HistoryForm action={updateHistory.bind(null, id)} initial={data} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deleteHistory.bind(null, id)} label="연혁 삭제" />
      </div>
    </>
  );
}
