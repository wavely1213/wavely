import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { MatchRow } from "@/lib/data/rows";
import { deleteMatch, updateMatch } from "../actions";
import type { GkInitialRow, GkPlayer } from "../GkConcededField";
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
  const [{ data }, players, gkRows] = await Promise.all([
    supabase.from("matches").select("*").eq("id", id).maybeSingle<MatchRow>(),
    supabase.from("players").select("id, name, number, position, is_active").order("number", { nullsFirst: false }).returns<GkPlayer[]>(),
    // 골키퍼 실점 (D-098) — 표가 없으면(마이그레이션 전) 칸을 숨긴다
    supabase.from("match_gk_conceded").select("player_id, conceded").eq("match_id", id).returns<GkInitialRow[]>(),
  ]);
  if (!data) notFound();
  const gk = players.error || gkRows.error ? undefined : { players: players.data ?? [], rows: gkRows.data ?? [] };

  return (
    <>
      <MatchForm action={updateMatch.bind(null, id)} initial={data} gk={gk} />
      <div className={styles.dangerZone}>
        <DeleteButton action={deleteMatch.bind(null, id)} label="경기 삭제" />
      </div>
    </>
  );
}
