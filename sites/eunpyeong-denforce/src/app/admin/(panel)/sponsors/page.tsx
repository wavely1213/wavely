import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { SPONSOR_TIER_LABEL } from "@/data/sponsors";
import { requireAdminPage } from "@/lib/admin/auth";
import type { SponsorRow } from "@/lib/data/rows";

export const metadata: Metadata = { title: "스폰서" };

export default function SponsorsAdminPage() {
  return (
    <>
      <PageTitle title="스폰서" description="홈페이지 메인/스폰서 페이지에 표시 순서대로 보입니다.">
        <Link href="/admin/sponsors/new" className={styles.button}>
          + 스폰서 추가
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <SponsorList />
      </Suspense>
    </>
  );
}

async function SponsorList() {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase.from("sponsors").select("*").order("sort_order").returns<SponsorRow[]>();
  const rows = data ?? [];

  if (rows.length === 0) return <p className={`${styles.panel} ${styles.empty}`}>등록된 스폰서가 없습니다.</p>;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>순서</th>
            <th>로고</th>
            <th>이름</th>
            <th>등급</th>
            <th>링크</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>{s.sort_order}</td>
              <td>
                {s.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo_url} alt="" className={styles.thumb} />
                ) : (
                  <span className={styles.badge}>없음</span>
                )}
              </td>
              <td>
                <Link href={`/admin/sponsors/${s.id}`} className={styles.rowLink}>
                  {s.name}
                </Link>
              </td>
              <td>
                <span className={`${styles.badge} ${styles.badgeBlue}`}>{SPONSOR_TIER_LABEL[s.tier]}</span>
              </td>
              <td className={styles.wrap}>{s.url ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
