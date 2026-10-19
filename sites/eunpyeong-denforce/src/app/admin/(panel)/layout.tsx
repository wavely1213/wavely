import { connection } from "next/server";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminMenu, AdminNav } from "@/components/admin/AdminNav";
import styles from "@/components/admin/admin.module.css";
import { SITE } from "@/config/site";
import { requireAdminPage } from "@/lib/admin/auth";
import { ADMIN_ROLE_LABEL, STAFF_ROLES } from "@/lib/admin/roles";
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
          {/* 등급마다 메뉴가 달라(D-057) 계정을 확인한 뒤 그린다 */}
          <Suspense fallback={null}>
            <RoleNav />
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

async function RoleNav() {
  // 요청마다 계정을 확인한다 — 미리 만든 화면에 메뉴가 들어가지 않게 (DB 없이 빌드할 때도)
  await connection();
  const { role } = await requireAdminPage(STAFF_ROLES);
  return <AdminNav role={role} />;
}

async function SignedInAs() {
  const { email, role } = await requireAdminPage(STAFF_ROLES);
  return (
    <span>
      {email} ({ADMIN_ROLE_LABEL[role]})
    </span>
  );
}
