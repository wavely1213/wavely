import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { PlayerRow } from "@/lib/data/rows";
import { deletePlayer, updatePlayer } from "../actions";
import { PlayerForm } from "../PlayerForm";

export const metadata: Metadata = { title: "선수 수정" };

// 라우트 타입(PageProps<"/admin/players/[id]">)은 빌드 때 생성되므로 params 타입을 직접 적는다
type Params = Promise<{ id: string }>;

export default function EditPlayerPage({ params }: { params: Params }) {
  return (
    <>
      <PageTitle title="선수 수정" back={{ href: "/admin/players", label: "선수 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: Params }) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  const { data } = await supabase.from("players").select("*").eq("id", id).maybeSingle<PlayerRow>();
  if (!data) notFound();

  return (
    <>
      <PlayerForm action={updatePlayer.bind(null, id)} initial={data} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deletePlayer.bind(null, id)} label="선수 삭제" />
      </div>
    </>
  );
}
