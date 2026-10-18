"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { ImageField, TextArea, TextField } from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/form";
import { MAX_UPLOAD_BATCH_BYTES } from "@/lib/admin/image-list";
import type { FieldDef } from "@/lib/content/fields";
import local from "./content.module.css";
import { MarkupEditor, type TokenInfo } from "./MarkupEditor";

export type FieldView = {
  key: string;
  def: FieldDef;
  /** 지금 화면에 보이는 값 (바꾼 값 또는 기본값) */
  value: string;
  /** 관리자가 바꾼 값인지 */
  customized: boolean;
};

/** 비우고 저장하면 기본값으로 — 짧은 기본값은 직접 보여 준다 */
function restoreHint(f: FieldView): string | null {
  if (!f.customized) return null;
  const short = f.def.default.length <= 40 && !f.def.default.includes("\n");
  return short ? `비우고 저장하면 처음 값 '${f.def.default}'(으)로 돌아갑니다` : "비우고 저장하면 처음 값으로 돌아갑니다";
}

function Field({ f, tokens }: { f: FieldView; tokens: TokenInfo[] }) {
  const hint = [f.def.hint, restoreHint(f)].filter(Boolean).join(" / ") || undefined;
  const label = f.customized ? `${f.def.label} (바꿈)` : f.def.label;
  if (f.def.editor) {
    // 처음 값 글('**창단** {창단연도} …')은 길어서 직접 보여 주지 않는다 — 전부 지우고 저장하면 처음 값으로
    const markupHint = [f.def.hint, f.customized && "칸을 모두 지우고 저장하면 처음 값으로 돌아갑니다"].filter(Boolean).join(" / ");
    return (
      <MarkupEditor
        name={f.key}
        label={label}
        hint={markupHint || undefined}
        defaultValue={f.value}
        multiline={f.def.editor === "markup"}
        tokens={tokens}
      />
    );
  }
  switch (f.def.kind) {
    case "image":
      return (
        <ImageField
          name={f.key}
          label={label}
          hint={f.def.hint}
          accept="image/jpeg,image/png,image/webp"
          currentUrl={f.customized ? f.value : null}
          defaultUrl={f.def.default}
        />
      );
    case "multiline":
    case "lines":
      return <TextArea name={f.key} label={label} hint={hint} rows={f.def.rows ?? (f.def.kind === "lines" ? 6 : 5)} defaultValue={f.value} />;
    case "date":
      return <TextField name={f.key} label={label} hint={hint} type="date" defaultValue={f.value} />;
    default:
      return <TextField name={f.key} label={label} hint={hint} maxLength={f.def.max} defaultValue={f.value} />;
  }
}

/** 구역(탭) 하나의 값 폼 — 묶음 제목 아래 칸들 (D-046) */
export function ContentFieldsForm({
  action,
  groups,
  tokens = [],
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  groups: Array<{ title: string; fields: FieldView[] }>;
  /** 푸터 글 편집기의 값 이름 (D-048) */
  tokens?: TokenInfo[];
}) {
  return (
    <AdminForm action={action} maxUploadBytes={MAX_UPLOAD_BATCH_BYTES}>
      {groups.map((g) => (
        <fieldset key={g.title} className={local.group}>
          <legend className={local.groupTitle}>{g.title}</legend>
          {g.fields.map((f) => (
            <Field key={f.key} f={f} tokens={tokens} />
          ))}
        </fieldset>
      ))}
    </AdminForm>
  );
}
