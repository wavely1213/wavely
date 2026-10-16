import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import { CONTENT_LISTS, isListKey } from "@/lib/content/lists";
import { sectionOfList } from "@/lib/content/sections";
import type { ContentItemRow } from "@/lib/data/rows";
import { deleteContentItem, updateContentItem } from "../../../actions";
import { ContentItemForm } from "../../../ContentItemForm";

export const metadata: Metadata = { title: "홈페이지 내용 · 수정" };

type Params = Promise<{ list: string; id: string }>;

export default function EditContentItemPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: { params: Params }) {
  const { list, id } = await params;
  if (!isListKey(list)) notFound();
  const { supabase } = await requireAdminPage();
  const { data } = await supabase
    .from("content_items")
    .select("id, list, title, body, link, image_url, sort_order")
    .eq("id", id)
    .eq("list", list)
    .maybeSingle<ContentItemRow>();
  if (!data) notFound();

  const def = CONTENT_LISTS[list];
  const section = sectionOfList(list);
  return (
    <>
      <PageTitle title={`${def.label} 수정`} back={{ href: `/admin/content/${section?.id ?? ""}`, label: `홈페이지 내용 · ${section?.label ?? ""}` }} />
      <ContentItemForm action={updateContentItem.bind(null, list, id)} def={def} initial={data} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deleteContentItem.bind(null, list, id)} label="이 항목 삭제" />
      </div>
    </>
  );
}
