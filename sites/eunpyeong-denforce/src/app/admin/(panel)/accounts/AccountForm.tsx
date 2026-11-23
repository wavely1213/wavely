"use client";

import { useState, type ChangeEvent } from "react";
import { AdminForm, useFieldDefault } from "@/components/admin/AdminForm";
import styles from "@/components/admin/admin.module.css";
import { CheckboxField, FixedField, SelectField, TextField } from "@/components/admin/fields";
import type { AdminAccountRow } from "@/lib/admin/accounts";
import type { ActionState } from "@/lib/admin/form";
import { ADMIN_ROLE_HINT, ADMIN_ROLE_LABEL, ADMIN_ROLES, isAdminRole, MEDIA_PERMS, type AdminRole } from "@/lib/admin/roles";

const ROLE_OPTIONS = ADMIN_ROLES.map((r) => ({ value: r, label: ADMIN_ROLE_LABEL[r] }));

/** 관리자 계정 추가/수정 — initial 이 있으면 이메일은 고정 (D-057) */
export function AccountForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: AdminAccountRow;
}) {
  return (
    <AdminForm action={action}>
      {initial ? (
        <FixedField label="이메일" value={initial.email} hint="이메일은 바꿀 수 없습니다. 다른 이메일은 계정을 새로 추가해 주세요." />
      ) : (
        <TextField
          name="email"
          label="이메일"
          type="email"
          required
          maxLength={254}
          hint="Supabase 로그인 계정과 같은 이메일"
        />
      )}
      <RoleFields initial={initial} />
    </AdminForm>
  );
}

/** 등급 + 미디어 권한 — 권한 칸은 등급이 '미디어'일 때만 보인다 */
function RoleFields({ initial }: { initial?: AdminAccountRow }) {
  const submitted = useFieldDefault("role", initial?.role ?? "media");
  const [role, setRole] = useState<AdminRole>(isAdminRole(submitted) ? submitted : "media");
  // 등급 칸의 change 가 이 묶음까지 올라온다
  const onChange = (e: ChangeEvent<HTMLDivElement>) => {
    const t = e.target as unknown as HTMLSelectElement;
    if (t.name === "role" && isAdminRole(t.value)) setRole(t.value);
  };
  return (
    <div className={styles.fieldGroup} onChange={onChange}>
      <SelectField name="role" label="등급" required options={ROLE_OPTIONS} defaultValue={initial?.role ?? "media"} hint={ADMIN_ROLE_HINT[role]} />
      {role === "media" && (
        <fieldset className={styles.fieldGroup}>
          <legend className={styles.label}>미디어 권한 (켠 것만 할 수 있습니다)</legend>
          {MEDIA_PERMS.map((p) => (
            <CheckboxField key={p.column} name={p.column} label={`${p.label}: ${p.hint}`} defaultChecked={initial?.[p.column] ?? false} />
          ))}
        </fieldset>
      )}
    </div>
  );
}
