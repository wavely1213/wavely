import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { SponsorRow } from "@/lib/data/rows";
import { deleteSponsor, updateSponsor } from "../actions";
import { SponsorForm } from "../SponsorForm";

export const metadata: Metadata = { title: "스폰서 수정" };

export default function EditSponsorPage({ params }: PageProps<"/admin/sponsors/[id]">) {
  return (
    <>
      <PageTitle title="스폰서 수정" back={{ href: "/admin/sponsors", label: "스폰서 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/sponsors/[id]">["params"] }) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  const { data } = await supabase.from("sponsors").select("*").eq("id", id).maybeSingle<SponsorRow>();
  if (!data) notFound();

  return (
    <>
      <SponsorForm action={updateSponsor.bind(null, id)} initial={data} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deleteSponsor.bind(null, id)} label="스폰서 삭제" />
      </div>
    </>
  );
}
