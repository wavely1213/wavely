import Link from "@/components/admin/AdminLink";
import { Suspense } from "react";
import { AdminNav, AdminNavLinks } from "@/components/admin/AdminNav";
import styles from "@/components/admin/admin.module.css";
import { SITE } from "@/config/site";
import { requireAdminPage } from "@/lib/admin/auth";
import { signOut } from "../actions";

// 관리자 화면 틀. 권한 확인은 여기서 하지 않는다 — 각 페이지 본문과 서버 액션이 requireAdmin*() 으로 한다.
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <Link href="/admin" className={styles.brand}>
          <strong>{SITE.name}</strong>
          <span>ADMIN</span>
        </Link>
        <Suspense fallback={<AdminNavLinks pathname="" />}>
          <AdminNav />
        </Suspense>
        <div className={styles.sideFoot}>
          <Suspense fallback={null}>
            <SignedInAs />
          </Suspense>
          <Link href="/" target="_blank">
            홈페이지 보기 ↗
          </Link>
          <form action={signOut}>
            <button type="submit" className={styles.linkButton}>
              로그아웃
            </button>
          </form>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

async function SignedInAs() {
  const { email } = await requireAdminPage();
  return <span>{email}</span>;
}
