"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { CheckboxField, ImageField, Row, SelectField, TextArea, TextField } from "@/components/admin/fields";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import type { ActionState } from "@/lib/admin/form";
import type { NewsRow } from "@/lib/data/rows";

const CATEGORY_OPTIONS = Object.entries(NEWS_CATEGORY_LABEL).map(([value, label]) => ({ value, label }));

export function NewsForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: NewsRow;
}) {
  return (
    <AdminForm action={action}>
      <Row>
        <SelectField name="category" label="분류" required options={CATEGORY_OPTIONS} defaultValue={initial?.category} />
        <TextField
          name="date"
          label="날짜"
          maxLength={10}
          hint="YYYY-MM-DD 또는 연도(YYYY)만, 모르면 비워 두세요. 예: 2026-10-15"
          defaultValue={initial?.date}
        />
      </Row>
      <TextField name="title" label="제목" required maxLength={120} defaultValue={initial?.title} />
      <TextArea name="summary" label="요약" rows={3} hint="300자 이하" defaultValue={initial?.summary} />
      <TextArea name="body" label="본문" hint="빈 줄(엔터 두 번)로 문단을 나눕니다." defaultValue={initial?.body} />
      <ImageField name="thumbnail" label="썸네일" currentUrl={initial?.thumbnail_url} />
      <CheckboxField name="published" label="홈페이지에 공개" defaultChecked={initial?.published ?? true} />
    </AdminForm>
  );
}
