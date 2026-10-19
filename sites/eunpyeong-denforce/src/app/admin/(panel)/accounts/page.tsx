import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { loginStatus, mediaPermSummary, normalizeEmail, type AdminAccountRow } from "@/lib/admin/accounts";
import { requireAdminPage } from "@/lib/admin/auth";
import { ADMIN_ROLE_HINT, ADMIN_ROLE_LABEL, ADMIN_ROLES, OWNER_ROLES } from "@/lib/admin/roles";

export const metadata: Metadata = { title: "관리자 계정" };

export default function AccountsPage() {
  return (
    <>
      <PageTitle title="관리자 계정" description="관리자 화면에 들어올 수 있는 계정과 등급을 정합니다. 최고 관리자만 볼 수 있습니다.">
        <Link href="/admin/accounts/new" className={styles.button}>
          + 계정 추가
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <AccountList />
      </Suspense>
      <LoginHelp />
    </>
  );
}

async function AccountList() {
  const { supabase, email: me } = await requireAdminPage(OWNER_ROLES);
  const { data, error } = await supabase.rpc("admin_accounts");
  if (error) return <p className={`${styles.panel} ${styles.empty}`}>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>;
  const rows = (data ?? []) as AdminAccountRow[];

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>이메일</th>
            <th>등급</th>
            <th>미디어 권한</th>
            <th>로그인</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const login = loginStatus(a);
            return (
              <tr key={a.email}>
                <td className={styles.wrap}>
                  <Link href={`/admin/accounts/edit?email=${encodeURIComponent(a.email)}`} className={styles.rowLink}>
                    {a.email}
                  </Link>
                  {normalizeEmail(a.email) === normalizeEmail(me) && " (나)"}
                </td>
                <td>
                  <span className={`${styles.badge} ${a.role === "media" ? "" : styles.badgeBlue}`}>{ADMIN_ROLE_LABEL[a.role]}</span>
                </td>
                <td className={styles.wrap}>{mediaPermSummary(a) ?? "-"}</td>
                <td className={styles.wrap}>{login.ready ? login.label : <span className={`${styles.badge} ${styles.badgeYellow}`}>{login.label}</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 등급 설명 + 로그인 계정 만드는 법 — 앱에는 비밀 키를 두지 않아 로그인 계정은 Supabase 에서 만든다 */
function LoginHelp() {
  return (
    <section className={styles.panel} style={{ marginTop: 24 }} aria-labelledby="account-help">
      <h2 className={styles.panelTitle} id="account-help">
        등급과 로그인 계정
      </h2>
      <ul className={styles.hint}>
        {ADMIN_ROLES.map((r) => (
          <li key={r}>
            <strong>{ADMIN_ROLE_LABEL[r]}</strong>: {ADMIN_ROLE_HINT[r]}
          </li>
        ))}
      </ul>
      <p className={styles.hint} style={{ marginTop: 12 }}>
        여기 목록은 &apos;관리자 화면에 들어와도 되는 이메일&apos;입니다. 비밀번호가 있는 로그인 계정은 Supabase 대시보드 › Authentication › Users ›
        Add user 에서 같은 이메일로 만듭니다 (&apos;Auto Confirm User&apos; 체크, 또는 Send invitation 으로 본인이 비밀번호를 정하게). 로그인 칸이
        &apos;로그인 계정 없음&apos;이면 아직 만들지 않은 것입니다.
      </p>
    </section>
  );
}
