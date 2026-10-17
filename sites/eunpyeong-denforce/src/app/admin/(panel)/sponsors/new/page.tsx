import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { createSponsor } from "../actions";
import { SponsorForm } from "../SponsorForm";

export const metadata: Metadata = { title: "스폰서 추가" };

export default function NewSponsorPage() {
  return (
    <>
      <PageTitle title="스폰서 추가" back={{ href: "/admin/sponsors", label: "스폰서 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  await requireAdminPage();
  return <SponsorForm action={createSponsor} />;
}
