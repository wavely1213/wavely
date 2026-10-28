import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { getSiteContent } from "@/lib/repo";
import { createMatch } from "../actions";
import { MatchForm } from "../MatchForm";

export const metadata: Metadata = { title: "경기 추가" };

export default function NewMatchPage() {
  return (
    <>
      <PageTitle title="경기 추가" back={{ href: "/admin/matches", label: "경기 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  await requireAdminPage();
  const content = await getSiteContent();
  return <MatchForm action={createMatch} defaultVenue={content["site.homeVenue"]} />;
}
