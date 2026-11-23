import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { createAlumnus } from "../actions";
import { AlumniForm } from "../AlumniForm";

export const metadata: Metadata = { title: "배출 국가대표 추가" };

export default function NewAlumnusPage() {
  return (
    <>
      <PageTitle title="배출 국가대표 추가" back={{ href: "/admin/club", label: "구단정보" }} />
      <Suspense fallback={<AdminLoading />}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  await requireAdminPage();
  return <AlumniForm action={createAlumnus} />;
}
