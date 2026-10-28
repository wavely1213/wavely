import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { STAFF_ROLES } from "@/lib/admin/roles";
import { createNews } from "../actions";
import { NewsForm } from "../NewsForm";

export const metadata: Metadata = { title: "소식 추가" };

export default function NewNewsPage() {
  return (
    <>
      <PageTitle title="소식 추가" back={{ href: "/admin/news", label: "구단소식 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  const { perms } = await requireAdminPage(STAFF_ROLES);
  return <NewsForm action={createNews} perms={perms} />;
}
