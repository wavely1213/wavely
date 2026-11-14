"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { ImageField, Row, TextField } from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/form";
import type { StaffRow } from "@/lib/data/rows";

export function StaffForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: StaffRow;
}) {
  return (
    <AdminForm action={action}>
      <Row>
        <TextField name="role" label="직책" required maxLength={40} placeholder="예: 감독" defaultValue={initial?.role} />
        <TextField name="name" label="이름" required maxLength={40} defaultValue={initial?.name} />
        <TextField
          name="sort_order"
          label="표시 순서"
          type="number"
          required
          hint="작은 숫자가 먼저 보입니다"
          defaultValue={initial?.sort_order ?? 0}
        />
      </Row>
      <ImageField name="photo" label="사진" currentUrl={initial?.photo_url} />
    </AdminForm>
  );
}
