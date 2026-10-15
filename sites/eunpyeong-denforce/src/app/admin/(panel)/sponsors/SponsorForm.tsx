"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { ImageField, Row, SelectField, TextField } from "@/components/admin/fields";
import { SPONSOR_TIER_LABEL } from "@/data/sponsors";
import type { ActionState } from "@/lib/admin/form";
import type { SponsorRow } from "@/lib/data/rows";

const TIER_OPTIONS = Object.entries(SPONSOR_TIER_LABEL).map(([value, label]) => ({ value, label }));

export function SponsorForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: SponsorRow;
}) {
  return (
    <AdminForm action={action}>
      <Row>
        <TextField name="name" label="이름" required maxLength={60} defaultValue={initial?.name} />
        <SelectField name="tier" label="등급" required options={TIER_OPTIONS} defaultValue={initial?.tier} />
      </Row>
      <Row>
        <TextField name="url" label="링크" type="url" placeholder="https://" defaultValue={initial?.url} />
        <TextField
          name="sort_order"
          label="표시 순서"
          type="number"
          required
          hint="작은 숫자가 먼저 보입니다"
          defaultValue={initial?.sort_order ?? 0}
        />
      </Row>
      <ImageField name="logo" label="로고" currentUrl={initial?.logo_url} />
    </AdminForm>
  );
}
