import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { createPlayer } from "../actions";
import { PlayerForm } from "../PlayerForm";

export const metadata: Metadata = { title: "선수 추가" };

export default function NewPlayerPage() {
  return (
    <>
      <PageTitle title="선수 추가" back={{ href: "/admin/players", label: "선수 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  await requireAdminPage();
  return <PlayerForm action={createPlayer} />;
}
