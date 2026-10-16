"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { ImageField, TextField } from "@/components/admin/fields";
import { ADMIN_PREVIEW_TEXT, SITE, SITE_DESCRIPTION } from "@/config/site";
import type { ActionState } from "@/lib/admin/form";
import { MAX_UPLOAD_BATCH_BYTES } from "@/lib/admin/image-list";
import { DEFAULT_PREVIEW } from "@/lib/og";
import local from "./club.module.css";

const IMAGE_HINT = "JPG·PNG, 1200×630 권장 (가운데에 중요한 내용 — 카카오톡은 양옆을 조금 자를 수 있음), 두 장 합계 4MB 이하";

export type PreviewSettingsValues = {
  og_image_url: string | null;
  og_title: string | null;
  og_description: string | null;
  admin_og_image_url: string | null;
  admin_og_title: string | null;
  admin_og_description: string | null;
};

/**
 * 링크 미리보기 폼 — 홈페이지 주소용 / 관리자 주소용 이미지·제목·설명 (D-037·D-038). 비우면 기본값.
 * 구단소식 글·선수 페이지는 그 글·선수 사진으로 따로 뜬다.
 */
export function PreviewSettingsForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial: PreviewSettingsValues;
}) {
  return (
    <AdminForm action={action} maxUploadBytes={MAX_UPLOAD_BATCH_BYTES}>
      <h3 className={local.subTitle}>홈페이지 주소 (eunpyeong-fs.com)</h3>
      <ImageField
        name="og_image"
        label="이미지"
        hint={`${IMAGE_HINT} · 구단소식 글·선수 페이지는 그 사진이 대신 뜹니다`}
        accept="image/jpeg,image/png"
        currentUrl={initial.og_image_url}
        defaultUrl={DEFAULT_PREVIEW.site.url}
      />
      <TextField
        name="og_title"
        label="제목"
        maxLength={60}
        placeholder={SITE.name}
        hint="60자 이하 · 비우면 기본 문구(흐린 글씨)"
        defaultValue={initial.og_title}
      />
      <TextField
        name="og_description"
        label="설명"
        maxLength={200}
        placeholder={SITE_DESCRIPTION}
        hint="200자 이하 · 비우면 기본 문구(흐린 글씨)"
        defaultValue={initial.og_description}
      />

      <h3 className={local.subTitle}>관리자 주소 (eunpyeong-fs.com/admin)</h3>
      <ImageField
        name="admin_og_image"
        label="이미지"
        hint={IMAGE_HINT}
        accept="image/jpeg,image/png"
        currentUrl={initial.admin_og_image_url}
        defaultUrl={DEFAULT_PREVIEW.admin.url}
      />
      <TextField
        name="admin_og_title"
        label="제목"
        maxLength={60}
        placeholder={ADMIN_PREVIEW_TEXT.title}
        hint="60자 이하 · 비우면 기본 문구(흐린 글씨)"
        defaultValue={initial.admin_og_title}
      />
      <TextField
        name="admin_og_description"
        label="설명"
        maxLength={200}
        placeholder={ADMIN_PREVIEW_TEXT.description}
        hint="200자 이하 · 비우면 기본 문구(흐린 글씨)"
        defaultValue={initial.admin_og_description}
      />
    </AdminForm>
  );
}
