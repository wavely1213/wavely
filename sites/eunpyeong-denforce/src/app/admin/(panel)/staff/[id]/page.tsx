import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { StaffRow } from "@/lib/data/rows";
import { deleteStaff, updateStaff } from "../actions";
import { StaffForm } from "../StaffForm";

export const metadata: Metadata = { title: "코칭스태프 수정" };

// 라우트 타입(PageProps<"/admin/staff/[id]">)은 빌드 때 생성되므로 params 타입을 직접 적는다
type Params = Promise<{ id: string }>;

export default function EditStaffPage({ params }: { params: Params }) {
  return (
    <>
      <PageTitle title="코칭스태프 수정" back={{ href: "/admin/staff", label: "코칭스태프 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: Params }) {
  const { supabase } = await requireAdminPage();
  const { id } = await params;
  const { data } = await supabase.from("staff").select("*").eq("id", id).maybeSingle<StaffRow>();
  if (!data) notFound();

  return (
    <>
      <StaffForm action={updateStaff.bind(null, id)} initial={data} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deleteStaff.bind(null, id)} label="코칭스태프 삭제" />
      </div>
    </>
  );
}
