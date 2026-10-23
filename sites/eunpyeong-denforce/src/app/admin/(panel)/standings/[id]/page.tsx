import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { StandingDbRow } from "@/lib/data/rows";
import { deleteStanding, updateStanding } from "../actions";
import { StandingForm } from "../StandingForm";

export const metadata: Metadata = { title: "팀 수정" };

// 라우트 타입(PageProps<"/admin/standings/[id]">)은 빌드 때 생성되므로 params 타입을 직접 적는다
type Params = Promise<{ id: string }>;

export default function EditStandingPage({ params }: { params: Params }) {
  return (
    <>
      <PageTitle title="팀 수정" back={{ href: "/admin/standings", label: "리그순위" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: Params }) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  const { data } = await supabase.from("standings").select("*").eq("id", id).maybeSingle<StandingDbRow>();
  if (!data) notFound();

  return (
    <>
      <StandingForm action={updateStanding.bind(null, id)} initial={data} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deleteStanding.bind(null, id)} label="팀 삭제" />
      </div>
    </>
  );
}
