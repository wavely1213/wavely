"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import styles from "@/components/admin/admin.module.css";
import { CheckboxField, Row, TextField } from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/form";
import type { StandingDbRow } from "@/lib/data/rows";

export function StandingForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: StandingDbRow;
}) {
  return (
    <AdminForm action={action}>
      <TextField name="team" label="팀" required maxLength={40} defaultValue={initial?.team} />
      <Row>
        <TextField name="win" label="승" type="number" required defaultValue={initial?.win ?? 0} />
        <TextField name="draw" label="무" type="number" required defaultValue={initial?.draw ?? 0} />
        <TextField name="loss" label="패" type="number" required defaultValue={initial?.loss ?? 0} />
      </Row>
      <Row>
        <TextField name="goals_for" label="득점" type="number" required defaultValue={initial?.goals_for ?? 0} />
        <TextField name="goals_against" label="실점" type="number" required defaultValue={initial?.goals_against ?? 0} />
      </Row>
      <p className={styles.hint}>경기 수·승점(승3·무1)은 자동 계산됩니다.</p>
      <CheckboxField name="is_us" label="우리 팀 (순위표에서 강조)" defaultChecked={initial?.is_us} />
    </AdminForm>
  );
}
