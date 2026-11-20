"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { ImageField, Row, TextArea, TextField } from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/form";

export type CrestFormValues = {
  name: string;
  aliases: string[];
  file_url: string | null;
  file_on_light_url: string | null;
  source: string | null;
  note: string;
};

const ACCEPT = "image/png,image/webp";

/** 상대팀 엠블럼 (D-094) — 이름, 다른 이름, 어두운 면 / 흰 면 파일, 받은 곳 */
export function CrestForm({
  action,
  initial,
  defaultFileUrl,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: CrestFormValues;
  /** 코드 목록에 있는 기본 파일 — 비우면 이 파일이 쓰인다 */
  defaultFileUrl?: string;
}) {
  return (
    <AdminForm action={action}>
      <Row>
        <TextField name="name" label="팀 이름" required maxLength={40} hint="경기 데이터에 쓰는 지금 이름" defaultValue={initial?.name} />
        <TextField
          name="aliases"
          label="다른 이름"
          maxLength={400}
          hint="예전 이름, 줄인 이름을 쉼표로 (최대 10개). 띄어쓰기와 대소문자는 신경 쓰지 않아도 됩니다."
          defaultValue={initial?.aliases.join(", ")}
        />
      </Row>
      <ImageField
        name="file"
        label="엠블럼 (어두운 면, 기본)"
        accept={ACCEPT}
        hint="구단에서 받은 투명 바탕 PNG/WebP, 긴 변 256px 이상 권장. 원, 그림자, 흰 원판이 없는 원본. 비우면 코드 기본값(있으면) 또는 대체 방패"
        currentUrl={initial?.file_url}
        defaultUrl={defaultFileUrl}
        drive="crest"
      />
      <ImageField
        name="file_on_light"
        label="흰 면용 엠블럼 (선택)"
        accept={ACCEPT}
        hint="흰 글씨 로고처럼 흰 면(경기표, 순위표)에서 안 보일 때만. 위 파일과 같은 크기로"
        currentUrl={initial?.file_on_light_url}
        drive="crest"
      />
      <TextField name="source" label="받은 곳" maxLength={300} hint="구단 홈페이지, 공식 SNS 등 (기록용)" defaultValue={initial?.source ?? undefined} />
      <TextArea name="note" label="메모" rows={2} defaultValue={initial?.note} />
    </AdminForm>
  );
}
