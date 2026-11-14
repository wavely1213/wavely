import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { requireAdminPage } from "@/lib/admin/auth";
import { crestEntryFor } from "@/lib/crests";
import { saveCrest } from "../actions";
import { CrestForm } from "../CrestForm";

export const metadata: Metadata = { title: "상대팀 엠블럼 추가" };

/** 새 팀 또는 코드 기본값 팀에 파일 올리기 — ?name= 이 코드 목록 팀이면 이름과 다른 이름을 채운다 */
export default function NewCrestPage({ searchParams }: PageProps<"/admin/crests/new">) {
  return (
    <>
      <PageTitle title="상대팀 엠블럼 추가" back={{ href: "/admin/crests", label: "상대팀 엠블럼 목록" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Editor({ searchParams }: { searchParams: PageProps<"/admin/crests/new">["searchParams"] }) {
  await requireAdminPage();
  const raw = (await searchParams).name;
  const code = typeof raw === "string" ? crestEntryFor(raw) : null;
  return (
    <CrestForm
      action={saveCrest.bind(null, null)}
      initial={code ? { name: code.name, aliases: code.aliases, file_url: null, file_on_light_url: null, source: null, note: "" } : undefined}
      defaultFileUrl={code?.file ?? undefined}
    />
  );
}
