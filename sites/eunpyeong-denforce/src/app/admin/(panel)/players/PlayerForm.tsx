"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { CheckboxField, ImageField, Row, SelectField, TextField } from "@/components/admin/fields";
import { POSITION_LABEL, POSITION_ORDER } from "@/data/people";
import type { ActionState } from "@/lib/admin/form";
import type { PlayerRow } from "@/lib/data/rows";

const POSITION_OPTIONS = POSITION_ORDER.map((p) => ({ value: p, label: POSITION_LABEL[p] }));

export function PlayerForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: PlayerRow;
}) {
  return (
    <AdminForm action={action}>
      <Row>
        <TextField
          name="number"
          label="등번호"
          type="number"
          hint="0~99, 없으면 비워 두세요"
          defaultValue={initial?.number}
        />
        <TextField name="name" label="이름" required maxLength={40} defaultValue={initial?.name} />
        <SelectField
          name="position"
          label="포지션"
          required
          options={POSITION_OPTIONS}
          defaultValue={initial?.position}
        />
      </Row>
      <TextField
        name="slug"
        label="주소"
        placeholder="no-7"
        hint="홈페이지 주소에 쓰입니다 (/team/players/주소). 영문 소문자·숫자·하이픈(-)만, 비우면 등번호로 no-번호"
        defaultValue={initial?.slug}
      />
      <Row>
        <TextField name="birth" label="생년월일" type="date" defaultValue={initial?.birth} />
        <TextField
          name="height_cm"
          label="신장(cm)"
          type="number"
          hint="100~250, 모르면 비워 두세요"
          defaultValue={initial?.height_cm}
        />
      </Row>
      <Row>
        <TextField name="apps" label="출전" type="number" required defaultValue={initial?.apps ?? 0} />
        <TextField name="goals" label="득점" type="number" required defaultValue={initial?.goals ?? 0} />
        <TextField name="assists" label="도움" type="number" required defaultValue={initial?.assists ?? 0} />
      </Row>
      <ImageField name="photo" label="사진" currentUrl={initial?.photo_url} />
      <CheckboxField
        name="is_active"
        label="활동 중 (끄면 홈페이지에서 숨깁니다)"
        defaultChecked={initial?.is_active ?? true}
      />
    </AdminForm>
  );
}
