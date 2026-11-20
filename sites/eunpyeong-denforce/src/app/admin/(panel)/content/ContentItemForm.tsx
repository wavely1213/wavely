"use client";

import { AdminForm } from "@/components/admin/AdminForm";
import { ImageField, Row, TextArea, TextField } from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/form";
import { MAX_UPLOAD_BATCH_BYTES } from "@/lib/admin/image-list";
import type { ListDef } from "@/lib/content/lists";

export type ItemInitial = { title: string; body: string; link: string; image_url: string | null; sort_order: number };

/** 목록 한 줄 폼 — 목록마다 정한 칸(title·body·link·image)만 보인다 (D-046) */
export function ContentItemForm({
  action,
  def,
  initial,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  def: ListDef;
  initial?: ItemInitial;
}) {
  const { title, body, link, image } = def.columns;
  return (
    <AdminForm action={action} maxUploadBytes={MAX_UPLOAD_BATCH_BYTES}>
      {title && <TextField name="title" label={title.label} required={title.required} maxLength={title.max} hint={title.hint} defaultValue={initial?.title} />}
      {body &&
        (body.multiline ? (
          <TextArea name="body" label={body.label} required={body.required} hint={body.hint} rows={5} defaultValue={initial?.body} />
        ) : (
          <TextField name="body" label={body.label} required={body.required} maxLength={body.max} hint={body.hint} defaultValue={initial?.body} />
        ))}
      {link && <TextField name="link" label={link.label} required={link.required} maxLength={link.max} hint={link.hint} defaultValue={initial?.link} />}
      {image && (
        <ImageField
          name="image"
          label={image.label}
          required={image.required}
          hint={image.hint}
          currentUrl={initial?.image_url}
          removable={!image.required}
        />
      )}
      <Row>
        <TextField
          name="sort_order"
          label="표시 순서"
          type="number"
          required
          hint="작은 숫자가 앞에 보입니다 (10, 20, 30… 으로 두면 사이에 끼워 넣기 쉽습니다)"
          defaultValue={initial?.sort_order ?? 0}
        />
      </Row>
    </AdminForm>
  );
}
