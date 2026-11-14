import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { MatchRow } from "@/lib/data/rows";
import { deleteMatch, updateMatch } from "../actions";
import { MatchForm } from "../MatchForm";

export const metadata: Metadata = { title: "경기 수정" };

// 라우트 타입(PageProps<"/admin/matches/[id]">)은 빌드 때 생성되므로 params 타입을 직접 적는다
type Params = Promise<{ id: string }>;

export default function EditMatchPage({ params }: { params: Params }) {
  return (
    <>
      <PageTitle title="경기 수정" back={{ href: "/admin/matches", label: "경기 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: Params }) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  const { data } = await supabase.from("matches").select("*").eq("id", id).maybeSingle<MatchRow>();
  if (!data) notFound();

  return (
    <>
      <MatchForm action={updateMatch.bind(null, id)} initial={data} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deleteMatch.bind(null, id)} label="경기 삭제" />
      </div>
    </>
  );
}
