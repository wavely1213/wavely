"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { CheckboxField, FixedField, ImageField, ImagesField, ReviewNote, Row, SelectField, TextArea, TextField } from "@/components/admin/fields";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import type { ActionState } from "@/lib/admin/form";
import { MAX_NEWS_IMAGES, MAX_UPLOAD_BATCH_BYTES } from "@/lib/admin/image-list";
import type { PostPerms } from "@/lib/admin/roles";
import { formatPostDate } from "@/lib/format";
import type { NewsRow } from "@/lib/data/rows";

const CATEGORY_OPTIONS = Object.entries(NEWS_CATEGORY_LABEL).map(([value, label]) => ({ value, label }));

/** perms: 이 계정의 글 권한 — 권한이 없는 칸은 숨기거나 값만 보여 준다 (미디어 계정, D-057) */
export function NewsForm({
  action,
  initial,
  perms,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial?: NewsRow;
  perms: PostPerms;
}) {
  return (
    <AdminForm action={action} maxUploadBytes={MAX_UPLOAD_BATCH_BYTES}>
      <Row>
        <SelectField name="category" label="분류" required options={CATEGORY_OPTIONS} defaultValue={initial?.category} />
        {perms.setDate ? (
          <TextField
            name="date"
            label="날짜"
            maxLength={10}
            hint="YYYY-MM-DD 또는 연도(YYYY)만, 모르면 비워 두세요. 예: 2026-10-15"
            defaultValue={initial?.date}
          />
        ) : (
          <FixedField
            label="날짜"
            value={initial ? (initial.date ? formatPostDate(initial.date) : "-") : "저장한 날"}
            hint="날짜는 최고 관리자가 정합니다."
          />
        )}
      </Row>
      <TextField name="title" label="제목" required maxLength={120} defaultValue={initial?.title} />
      <TextArea name="summary" label="요약" rows={3} hint="300자 이하" defaultValue={initial?.summary} />
      <TextArea name="body" label="본문" hint="빈 줄(엔터 두 번)로 문단을 나눕니다." defaultValue={initial?.body} />
      <TextField
        name="video_url"
        label="영상 주소"
        type="url"
        maxLength={300}
        hint="구단영상: 유튜브/인스타그램(릴스) 주소를 넣으면 글 상세에서 바로 재생됩니다. 목록 카드 사진은 썸네일을 올려 주세요."
        defaultValue={initial?.video_url}
      />
      <ImageField
        name="thumbnail"
        label="썸네일"
        hint="목록 카드에 쓰는 사진. 비워 두면 아래 첫 번째 사진을 씁니다. JPG/PNG/WEBP/GIF"
        currentUrl={initial?.thumbnail_url}
      />
      <ImagesField
        name="images"
        label="사진"
        hint={`글 상세에 올린 순서대로 보입니다. 여러 장을 한 번에 고를 수 있습니다 (최대 ${MAX_NEWS_IMAGES}장). 한 번 저장에 올리는 파일은 썸네일 포함 합계 4MB 이하 — 넘으면 나눠서 저장하세요.`}
        currentUrls={initial?.images}
        batchBytes={MAX_UPLOAD_BATCH_BYTES}
      />
      {perms.feature && (
        <CheckboxField name="featured" label="구단소식 맨 위 메인 배너에 고정 (고정한 글이 없으면 최근 소식이 자동으로 나옵니다)" defaultChecked={initial?.featured ?? false} />
      )}
      {perms.publish ? (
        <CheckboxField name="published" label="홈페이지에 공개" defaultChecked={initial?.published ?? true} />
      ) : (
        <ReviewNote published={initial?.published ?? false} />
      )}
    </AdminForm>
  );
}
