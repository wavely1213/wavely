import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import { crestEntryFor } from "@/lib/crests";
import { deleteCrest, saveCrest } from "../actions";
import { CrestForm, type CrestFormValues } from "../CrestForm";

export const metadata: Metadata = { title: "상대팀 엠블럼 수정" };

export default function EditCrestPage({ params }: PageProps<"/admin/crests/[id]">) {
  return (
    <>
      <PageTitle title="상대팀 엠블럼 수정" back={{ href: "/admin/crests", label: "상대팀 엠블럼 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/crests/[id]">["params"] }) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  const { data } = await supabase.from("team_crests").select("name, aliases, file_url, file_on_light_url, source, note").eq("id", id).maybeSingle<CrestFormValues>();
  if (!data) notFound();
  return (
    <>
      <CrestForm action={saveCrest.bind(null, id)} initial={data} defaultFileUrl={crestEntryFor(data.name)?.file ?? undefined} />
      <div className={styles.dangerZone}>
        <DeleteButton
          action={deleteCrest.bind(null, id)}
          label="관리자 엠블럼 지우기"
          confirmText="올린 파일을 지우고 코드 기본값(없으면 대체 방패)으로 돌아갑니다. 지울까요?"
        />
      </div>
    </>
  );
}
