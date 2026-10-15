import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { StaffRow } from "@/lib/data/rows";

export const metadata: Metadata = { title: "코칭스태프" };

export default function StaffAdminPage() {
  return (
    <>
      <PageTitle title="코칭스태프" description="홈페이지 코칭스태프 페이지에 표시 순서대로 보입니다.">
        <Link href="/admin/staff/new" className={styles.button}>
          + 코칭스태프 추가
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <StaffList />
      </Suspense>
    </>
  );
}

async function StaffList() {
  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase.from("staff").select("*").order("sort_order").returns<StaffRow[]>();

  if (error) {
    return <p className={`${styles.panel} ${styles.empty}`}>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>;
  }
  const rows = data ?? [];
  if (rows.length === 0) return <p className={`${styles.panel} ${styles.empty}`}>등록된 코칭스태프가 없습니다.</p>;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>순서</th>
            <th>사진</th>
            <th>직책</th>
            <th>이름</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>{s.sort_order}</td>
              <td>
                {s.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photo_url} alt="" className={styles.thumb} />
                ) : (
                  <span className={styles.badge}>없음</span>
                )}
              </td>
              <td>{s.role}</td>
              <td>
                <Link href={`/admin/staff/${s.id}`} className={styles.rowLink}>
                  {s.name}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
