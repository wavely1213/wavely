import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { createHistory } from "../actions";
import { HistoryForm } from "../HistoryForm";

export const metadata: Metadata = { title: "연혁 추가" };

export default function NewHistoryPage() {
  return (
    <>
      <PageTitle title="연혁 추가" back={{ href: "/admin/club", label: "구단정보" }} />
      <Suspense fallback={<AdminLoading />}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  await requireAdminPage();
  return <HistoryForm action={createHistory} />;
}
