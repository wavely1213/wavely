import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { AlumniRow } from "@/lib/data/rows";
import { deleteAlumnus, updateAlumnus } from "../actions";
import { AlumniForm } from "../AlumniForm";

export const metadata: Metadata = { title: "배출 국가대표 수정" };

// 라우트 타입은 빌드 때 생성되므로 params 타입을 직접 적는다
type Params = Promise<{ id: string }>;

export default function EditAlumnusPage({ params }: { params: Params }) {
  return (
    <>
      <PageTitle title="배출 국가대표 수정" back={{ href: "/admin/club", label: "구단정보" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: Params }) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  const { data } = await supabase
    .from("national_team_alumni")
    .select("id, name, position, years, sort_order")
    .eq("id", id)
    .maybeSingle<AlumniRow>();
  if (!data) notFound();

  return (
    <>
      <AlumniForm action={updateAlumnus.bind(null, id)} initial={data} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deleteAlumnus.bind(null, id)} label="이 사람 삭제" />
      </div>
    </>
  );
}
