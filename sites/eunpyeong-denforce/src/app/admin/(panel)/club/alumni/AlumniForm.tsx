"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { Row, TextField } from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/form";
import type { AlumniRow } from "@/lib/data/rows";

/** 배출 풋살 국가대표 한 사람 (D-043) */
export function AlumniForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: AlumniRow;
}) {
  return (
    <AdminForm action={action}>
      <Row>
        <TextField name="name" label="이름" required maxLength={30} defaultValue={initial?.name} />
        <TextField
          name="position"
          label="포지션"
          maxLength={10}
          hint="예: FP(필드) 또는 GK(골레이로)"
          defaultValue={initial?.position}
        />
      </Row>
      <Row>
        <TextField
          name="years"
          label="국가대표 발탁"
          required
          maxLength={100}
          hint="발탁 연도를 쉼표로 — 예: 2014, 2015, 2019"
          defaultValue={initial?.years}
        />
        <TextField
          name="sort_order"
          label="표시 순서"
          type="number"
          required
          hint="작은 숫자가 위에 보입니다 (10, 20, 30… 으로 두면 사이에 끼워 넣기 쉽습니다)"
          defaultValue={initial?.sort_order ?? 0}
        />
      </Row>
    </AdminForm>
  );
}
