"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { CheckboxField, ImageField, Row, SelectField, TextField } from "@/components/admin/fields";

/** 주장단 고르기 (D-093) — 빈 값 = 없음 */
const CAPTAIN_OPTIONS = [
  { value: "", label: "없음" },
  { value: "C", label: "주장 (C)" },
  { value: "VC", label: "부주장 (VC)" },
];
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
      <SelectField
        name="captain"
        label="주장단"
        options={CAPTAIN_OPTIONS}
        hint="선수 카드 이름 옆 C / VC 배지와 선수 상세 '주장' / '부주장' 글자로 보입니다."
        defaultValue={initial?.captain ?? ""}
      />
      <TextField
        name="slug"
        label="주소"
        placeholder="no-7"
        hint="홈페이지 주소에 쓰입니다 (/team/players/주소). 영문 소문자/숫자/하이픈(-)만, 비우면 등번호로 no-번호"
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
      <ImageField name="photo" label="사진" currentUrl={initial?.photo_url} drive="players" />
      <CheckboxField
        name="is_active"
        label="활동 중 (끄면 홈페이지에서 숨깁니다)"
        defaultChecked={initial?.is_active ?? true}
      />
    </AdminForm>
  );
}
