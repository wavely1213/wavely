"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { ImageField } from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/form";
import { MAX_UPLOAD_BATCH_BYTES } from "@/lib/admin/image-list";
import { DEFAULT_PREVIEW } from "@/lib/og";

const HINT = "JPG·PNG, 1200×630 권장 (가운데에 중요한 내용 — 카카오톡은 양옆을 조금 자를 수 있음), 두 장 합계 4MB 이하";

/** 링크 미리보기 이미지 폼 — 사이트 주소용 / 관리자 주소용 (D-037). 비우면 기본 이미지 */
export function PreviewImagesForm({
  action,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial: { og_image_url: string | null; admin_og_image_url: string | null };
}) {
  return (
    <AdminForm action={action} maxUploadBytes={MAX_UPLOAD_BATCH_BYTES}>
      <ImageField
        name="og_image"
        label="사이트 미리보기 이미지"
        hint={`홈페이지 주소(eunpyeong-fs.com)를 보낼 때 · ${HINT}`}
        accept="image/jpeg,image/png"
        currentUrl={initial.og_image_url}
        defaultUrl={DEFAULT_PREVIEW.site.url}
      />
      <ImageField
        name="admin_og_image"
        label="관리자 페이지 미리보기 이미지"
        hint={`관리자 주소(eunpyeong-fs.com/admin)를 보낼 때 · ${HINT}`}
        accept="image/jpeg,image/png"
        currentUrl={initial.admin_og_image_url}
        defaultUrl={DEFAULT_PREVIEW.admin.url}
      />
    </AdminForm>
  );
}
