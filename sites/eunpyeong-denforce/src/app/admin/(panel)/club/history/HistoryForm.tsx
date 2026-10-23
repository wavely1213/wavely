"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { Row, TextField } from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/form";
import type { HistoryRow } from "@/lib/data/rows";

export function HistoryForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: HistoryRow;
}) {
  return (
    <AdminForm action={action}>
      <Row>
        <TextField
          name="year"
          label="연도"
          required
          maxLength={20}
          hint="예: 2025 또는 2021-22"
          defaultValue={initial?.year}
        />
        <TextField
          name="sort_order"
          label="표시 순서"
          type="number"
          required
          hint="작은 숫자가 위에 보입니다 — 최신 연혁이 위로 오게 작은 숫자를 주세요"
          defaultValue={initial?.sort_order ?? 0}
        />
      </Row>
      <TextField name="text" label="내용" required maxLength={300} hint="300자 이하" defaultValue={initial?.text} />
    </AdminForm>
  );
}
