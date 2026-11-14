import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { TEAM_CRESTS } from "@/config/team-crests";
import { requireAdminPage } from "@/lib/admin/auth";
import { crestEntryFor } from "@/lib/crests";

export const metadata: Metadata = { title: "상대팀 엠블럼" };

type Row = { id: string; name: string; aliases: string[]; file_url: string | null };

/** 관리자 › 경기 › 상대팀 엠블럼 (D-094, I-048) — 코드 기본값 + 관리자가 올린 것, 팀마다 한 줄 */
export default function CrestsAdminPage() {
  return (
    <>
      <PageTitle
        title="상대팀 엠블럼"
        description="경기 띠, 경기표, 순위표, 다음 홈경기 카드의 상대팀 엠블럼입니다. 올린 파일이 코드 기본값을 덮고, 지우면 기본값(없으면 대체 방패)으로 돌아갑니다."
      >
        <Link href="/admin/crests/new" className={styles.button}>
          + 팀 추가
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <CrestList />
      </Suspense>
    </>
  );
}

async function CrestList() {
  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase.from("team_crests").select("id, name, aliases, file_url").order("name").returns<Row[]>();
  const rows = data ?? [];
  // 코드 목록 팀 중 관리자 줄이 없는 것 + 관리자 줄
  const dbFor = (name: string) => rows.find((r) => crestEntryFor(name, [{ name: r.name, aliases: r.aliases, file: null, pixels: null, source: null, fetchedAt: null, note: "" }]));
  const codeOnly = TEAM_CRESTS.filter((e) => ![e.name, ...e.aliases].some((n) => dbFor(n)));
  const list = [
    ...rows.map((r) => ({ key: r.id, name: r.name, href: `/admin/crests/${r.id}`, img: r.file_url ?? crestEntryFor(r.name)?.file ?? null, from: r.file_url ? "관리자" : "코드 기본값" })),
    ...codeOnly.map((e) => ({ key: e.name, name: e.name, href: `/admin/crests/new?name=${encodeURIComponent(e.name)}`, img: e.file, from: e.file ? "코드 기본값" : "없음(대체 방패)" })),
  ].sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <>
      {error && (
        <p className={styles.formMessage} role="alert">
          관리자가 올린 엠블럼을 읽지 못했습니다(표가 아직 없으면 마이그레이션 적용 전입니다). 코드 기본값만 보입니다.
        </p>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>엠블럼</th>
              <th>팀</th>
              <th>파일</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.key}>
                <td>
                  {t.img ? (
                    // 관리자 미리보기 (최적화 불필요)
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.img} alt="" className={styles.thumb} />
                  ) : (
                    <span className={styles.badge}>없음</span>
                  )}
                </td>
                <td>
                  <Link href={t.href} className={styles.rowLink}>
                    {t.name}
                  </Link>
                </td>
                <td>{t.from}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
