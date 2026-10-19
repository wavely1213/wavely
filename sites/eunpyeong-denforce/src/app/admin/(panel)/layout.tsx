import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminMenu, AdminNav, AdminNavLinks } from "@/components/admin/AdminNav";
import styles from "@/components/admin/admin.module.css";
import { SITE } from "@/config/site";
import { requireAdminPage } from "@/lib/admin/auth";
import { getSiteContent } from "@/lib/repo";
import { signOut } from "../actions";

// 관리자 화면 틀. 권한 확인은 여기서 하지 않는다 — 각 페이지 본문과 서버 액션이 requireAdmin*() 으로 한다.
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.sideTop}>
          <Link href="/admin" className={styles.brand}>
            <Suspense fallback={<strong>{SITE.name}</strong>}>
              <BrandName />
            </Suspense>
            <span>ADMIN</span>
          </Link>
        </div>
        {/* 휴대폰에서는 '메뉴' 버튼으로 연다 (D-048) */}
        <AdminMenu>
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
        </AdminMenu>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

/** 구단 이름 — 관리자 › 홈페이지 내용 › 공통 (D-046) */
async function BrandName() {
  return <strong>{(await getSiteContent())["site.name"]}</strong>;
}

async function SignedInAs() {
  const { email } = await requireAdminPage();
  return <span>{email}</span>;
}
