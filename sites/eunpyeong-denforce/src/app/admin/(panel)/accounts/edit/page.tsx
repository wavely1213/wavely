import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { normalizeEmail, selfChangeError, type AdminAccountRow } from "@/lib/admin/accounts";
import { requireAdminPage } from "@/lib/admin/auth";
import { OWNER_ROLES } from "@/lib/admin/roles";
import { deleteAccount, updateAccount } from "../actions";
import { AccountForm } from "../AccountForm";

export const metadata: Metadata = { title: "계정 수정" };

// 이메일에 @ 등이 있어 경로 대신 ?email= 로 받는다. searchParams 타입은 직접 적는다 (PageProps 와 호환)
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function EditAccountPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageTitle title="계정 수정" back={{ href: "/admin/accounts", label: "관리자 계정" }} />
      <Suspense fallback={<AdminLoading />}>
        <Editor searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Editor({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, email: me } = await requireAdminPage(OWNER_ROLES);
  const raw = (await searchParams).email;
  if (typeof raw !== "string") notFound();
  const email = normalizeEmail(raw);
  const { data } = await supabase.rpc("admin_accounts");
  const account = ((data ?? []) as AdminAccountRow[]).find((a) => a.email === email);
  if (!account) notFound();
  const isMe = selfChangeError(email, me, "delete") !== null;

  return (
    <>
      {isMe && <p className={styles.hint}>내 계정입니다. 등급을 바꾸거나 지우려면 다른 최고 관리자가 해야 합니다.</p>}
      <AccountForm action={updateAccount.bind(null, account.email)} initial={account} />
      {!isMe && (
        <div className={styles.dangerZone}>
          <DeleteButton
            action={deleteAccount.bind(null, account.email)}
            label="계정 삭제"
            confirmText="이 이메일은 더 이상 관리자 화면에 들어올 수 없습니다. 삭제할까요? (Supabase 로그인 계정은 그대로 남습니다)"
          />
        </div>
      )}
    </>
  );
}
