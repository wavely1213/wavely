import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { createStanding } from "../actions";
import { StandingForm } from "../StandingForm";

export const metadata: Metadata = { title: "팀 추가" };

export default function NewStandingPage() {
  return (
    <>
      <PageTitle title="팀 추가" back={{ href: "/admin/standings", label: "리그순위" }} />
      <Suspense fallback={<AdminLoading />}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  await requireAdminPage();
  return <StandingForm action={createStanding} />;
}
