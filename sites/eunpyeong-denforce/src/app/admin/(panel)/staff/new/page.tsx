import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { createStaff } from "../actions";
import { StaffForm } from "../StaffForm";

export const metadata: Metadata = { title: "코칭스태프 추가" };

export default function NewStaffPage() {
  return (
    <>
      <PageTitle title="코칭스태프 추가" back={{ href: "/admin/staff", label: "코칭스태프 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  await requireAdminPage();
  return <StaffForm action={createStaff} />;
}
