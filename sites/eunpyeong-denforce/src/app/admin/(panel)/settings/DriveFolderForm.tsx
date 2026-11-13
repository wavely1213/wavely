"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { TextField } from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/form";

/** 드라이브 자료함 폴더 연결 (D-081) — 최고 관리자만 보인다. 링크를 넣으면 서버가 폴더 ID 만 저장한다 */
export function DriveFolderForm({
  action,
  initialLink,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initialLink: string;
}) {
  return (
    <AdminForm action={action} submitLabel="연결 저장">
      <TextField
        name="drive_folder"
        label="드라이브 폴더 링크"
        type="url"
        maxLength={500}
        hint="구글 드라이브 폴더 공유 링크. 드라이브에서 '링크가 있는 모든 사용자(뷰어)'로 공유해야 열립니다. 비우고 저장하면 연결을 끊습니다."
        defaultValue={initialLink}
      />
    </AdminForm>
  );
}
