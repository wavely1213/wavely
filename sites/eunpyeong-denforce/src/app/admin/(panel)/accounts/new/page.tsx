import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { OWNER_ROLES } from "@/lib/admin/roles";
import { createAccount } from "../actions";
import { AccountForm } from "../AccountForm";

export const metadata: Metadata = { title: "계정 추가" };

export default function NewAccountPage() {
  return (
    <>
      <PageTitle title="계정 추가" back={{ href: "/admin/accounts", label: "관리자 계정" }} />
      <Suspense fallback={<AdminLoading />}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  await requireAdminPage(OWNER_ROLES);
  return <AccountForm action={createAccount} />;
}
