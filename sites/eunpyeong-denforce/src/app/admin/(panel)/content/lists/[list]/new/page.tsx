import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { CONTENT_LISTS, isListKey } from "@/lib/content/lists";
import { sectionOfList } from "@/lib/content/sections";
import { createContentItem } from "../../../actions";
import { ContentItemForm } from "../../../ContentItemForm";

export const metadata: Metadata = { title: "홈페이지 내용 / 추가" };

type Params = Promise<{ list: string }>;

export function generateStaticParams() {
  return Object.keys(CONTENT_LISTS).map((list) => ({ list }));
}

export default function NewContentItemPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: { params: Params }) {
  const { list } = await params;
  if (!isListKey(list)) notFound();
  await requireAdminPage();
  const def = CONTENT_LISTS[list];
  const section = sectionOfList(list);
  return (
    <>
      <PageTitle title={`${def.label} 추가`} back={{ href: `/admin/content/${section?.id ?? ""}`, label: `홈페이지 내용 / ${section?.label ?? ""}` }} />
      <ContentItemForm action={createContentItem.bind(null, list)} def={def} />
    </>
  );
}
