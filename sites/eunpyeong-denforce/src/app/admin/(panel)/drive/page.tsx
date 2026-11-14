import type { Metadata } from "next";
import { Suspense } from "react";
import { DriveLibrary } from "@/components/admin/drive/DriveLibrary";
import { RecentImports, type RecentImport } from "@/components/admin/drive/RecentImports";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import { STAFF_ROLES } from "@/lib/admin/roles";

export const metadata: Metadata = { title: "드라이브 자료함" };

/**
 * 관리자 › 드라이브 자료함 (D-081) — 연결한 구글 드라이브 폴더를 탐색하고, 고른 사진을 저장소로 가져온다.
 * 자동 게시는 없다. 가져온 주소는 글/선수 폼의 '드라이브에서 가져오기'에서 바로 고를 수도 있다.
 */
export default function DrivePage() {
  return (
    <>
      <PageTitle
        title="드라이브 자료함"
        description="구단 구글 드라이브의 경기 사진, 선수 프로필, 영상, 엠블럼을 골라 가져옵니다. 사이트에 바로 올라가지 않고, 글/선수 폼에서 골라 넣어야 보입니다."
      />
      <Suspense fallback={<AdminLoading />}>
        <LibraryPanels />
      </Suspense>
    </>
  );
}

async function LibraryPanels() {
  const { supabase } = await requireAdminPage(STAFF_ROLES);
  const { data, error } = await supabase
    .from("drive_imports")
    .select("file_id, kind, purpose, file_name, url, view_url, imported_at")
    .order("imported_at", { ascending: false })
    .limit(24)
    .returns<RecentImport[]>();
  return (
    <>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>드라이브</h2>
        <DriveLibrary />
      </section>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>최근 가져온 파일</h2>
        {error ? (
          <p className={styles.formMessage} role="alert">
            가져온 기록을 불러오지 못했습니다. 새로고침해 주세요.
          </p>
        ) : (
          <RecentImports items={data ?? []} />
        )}
      </section>
    </>
  );
}
