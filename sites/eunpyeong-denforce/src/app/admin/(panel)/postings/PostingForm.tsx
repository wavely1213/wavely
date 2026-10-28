"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { CheckboxField, ImageField, ReviewNote, Row, SelectField, TextArea, TextField } from "@/components/admin/fields";
import { POSTING_KIND_LABEL, POSTING_PLATFORM_LABEL } from "@/data/postings";
import type { ActionState } from "@/lib/admin/form";
import type { PostPerms } from "@/lib/admin/roles";
import type { PostingRow } from "@/lib/data/rows";

const KIND_OPTIONS = Object.entries(POSTING_KIND_LABEL).map(([value, label]) => ({ value, label }));
const PLATFORM_OPTIONS = Object.entries(POSTING_PLATFORM_LABEL).map(([value, label]) => ({ value, label }));

/** perms: 이 계정의 글 권한 — '직접 공개' 권한이 없으면 공개 칸 대신 검토 안내 (미디어 계정, D-057) */
export function PostingForm({
  action,
  initial,
  perms,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: PostingRow;
  perms: PostPerms;
}) {
  return (
    <AdminForm action={action}>
      <TextField name="url" label="원문 주소" type="url" required placeholder="https://" defaultValue={initial?.url} />
      <TextField name="title" label="제목" required maxLength={200} defaultValue={initial?.title} />
      <Row>
        <SelectField name="kind" label="분류" required options={KIND_OPTIONS} defaultValue={initial?.kind} />
        <SelectField name="platform" label="출처" required options={PLATFORM_OPTIONS} defaultValue={initial?.platform} />
      </Row>
      <Row>
        <TextField
          name="author"
          label="작성자"
          maxLength={60}
          hint="블로그 이름/언론사/채널 이름"
          defaultValue={initial?.author}
        />
        <TextField name="posted_on" label="날짜" type="date" required defaultValue={initial?.posted_on} />
      </Row>
      <TextArea name="excerpt" label="요약" rows={3} hint="300자 이하 / 목록에는 보이지 않고 관리용" defaultValue={initial?.excerpt} />
      <ImageField name="thumbnail" label="대표 사진" hint="JPG/PNG/WEBP/GIF, 5MB 이하 / 없으면 엠블럼 배경으로 보입니다" currentUrl={initial?.thumbnail_url} />
      {perms.publish ? (
        // 새 글은 공개된 뒤에도 고칠 수 있는 계정만 '공개'로 시작 — 미디어가 저장하자마자 잠기지 않게
        <CheckboxField name="published" label="홈페이지에 공개" defaultChecked={initial?.published ?? perms.editPublished} />
      ) : (
        <ReviewNote published={initial?.published ?? false} />
      )}
    </AdminForm>
  );
}
