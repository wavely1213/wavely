"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import { removeImages, resolveImage } from "@/lib/admin/storage";
import { CONTENT_FIELDS, type ContentKey, type FieldDef } from "@/lib/content/fields";
import { CONTENT_LISTS, isListKey, type ListDef, type ListKey } from "@/lib/content/lists";
import { findSection, sectionOfList } from "@/lib/content/sections";
import { readItem, resolveContent, storedValue } from "@/lib/content/values";
import { contentMap, type ContentItemRow, type SiteContentRow } from "@/lib/data/rows";

// 홈페이지 내용(site_content · content_items) 서버 액션 (D-046) — 모든 액션이 직접 관리자 권한을 확인한다.
// 어떤 키·목록을 받을지는 클라이언트가 아니라 코드의 목록(fields·lists·sections)이 정한다.

/**
 * 구역(탭) 하나의 값 저장 — 바꾼 값만 저장하고, 비우거나 기본값과 같아지면 행을 지운다(기본값으로).
 * 순서: 권한 → 현재 값(DB) → 검사·사진 업로드 → 저장·삭제 → 바뀐 옛 사진 삭제 → updateTag. 같은 화면에 머문다.
 */
export async function saveContentSection(sectionId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };
  const section = findSection(sectionId);
  if (!section) return { message: "없는 구역입니다." };

  const keys: ContentKey[] = section.groups.flatMap((g) => [...g.keys]);
  const { data: rows, error: readError } = await ctx.supabase
    .from("site_content")
    .select("key, value")
    .in("key", keys)
    .returns<SiteContentRow[]>();
  if (readError) return { message: dbErrorMessage(readError), values: submittedValues(fd) };
  const current = contentMap(rows ?? []);

  const f = new FormReader(fd);
  const upserts: Array<{ key: string; value: string }> = [];
  const deletes: string[] = [];
  const uploaded: string[] = [];
  const replaced: string[] = [];

  for (const key of keys) {
    const def: FieldDef = CONTENT_FIELDS[key];
    const cur = current[key] ?? null;
    if (def.kind === "image") {
      const url = await resolveImage(ctx, f, key, "content", cur);
      if (url === cur) continue;
      if (url) uploaded.push(url);
      if (cur) replaced.push(cur);
      if (url) upserts.push({ key, value: url });
      else deletes.push(key);
      continue;
    }
    const raw = fd.get(key);
    if (typeof raw !== "string") continue; // 폼에 없는 칸은 건드리지 않는다
    const r = storedValue(def, raw);
    if (!r.ok) {
      f.reject(key, r.error);
      continue;
    }
    if (r.value === null) {
      if (cur !== null) deletes.push(key);
    } else if (r.value !== cur) {
      upserts.push({ key, value: r.value });
    }
  }

  if (f.hasErrors) {
    await removeImages(ctx, uploaded);
    return f.state();
  }

  if (upserts.length > 0) {
    const { error } = await ctx.supabase.from("site_content").upsert(upserts, { onConflict: "key" });
    if (error) {
      await removeImages(ctx, uploaded);
      return { message: dbErrorMessage(error), values: submittedValues(fd) };
    }
  }
  if (deletes.length > 0) {
    const { error } = await ctx.supabase.from("site_content").delete().in("key", deletes);
    if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }
  // 바꾸거나 기본으로 되돌린 옛 사진 (우리 저장소에 올린 것만 지워진다)
  await removeImages(ctx, replaced);

  updateTag(TAGS.content);
  // 저장된 결과를 폼 기본값으로 — 비운 칸은 기본값이 다시 채워져 보인다
  const saved: Record<string, string> = { ...current };
  for (const u of upserts) saved[u.key] = u.value;
  for (const k of deletes) delete saved[k];
  const shown = resolveContent(saved);
  return {
    ok: true,
    message: "저장했습니다. 홈페이지에 바로 반영됩니다 (늦어도 1분 이내).",
    values: Object.fromEntries(keys.filter((k) => CONTENT_FIELDS[k].kind !== "image").map((k) => [k, shown[k]])),
  };
}

// ── 목록 (content_items) ──

function listOrNull(list: string): { key: ListKey; def: ListDef } | null {
  return isListKey(list) ? { key: list, def: CONTENT_LISTS[list] } : null;
}

function backTo(list: ListKey) {
  return `/admin/content/${sectionOfList(list)?.id ?? ""}`;
}

/** 글 칸 + 표시 순서 검사. 오류는 reader 에 남긴다 */
function readItemForm(def: ListDef, f: FormReader, fd: FormData) {
  const str = (name: string) => {
    const v = fd.get(name);
    return typeof v === "string" ? v : "";
  };
  const { values, errors } = readItem(def, { title: str("title"), body: str("body"), link: str("link") });
  for (const [name, message] of Object.entries(errors)) f.reject(name, message);
  const sort_order = f.int("sort_order", { label: "표시 순서", min: 0, max: 9999, required: true });
  return { ...values, sort_order };
}

export async function createContentItem(list: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };
  const l = listOrNull(list);
  if (!l) return { message: "없는 목록입니다." };

  const { count, error: countError } = await ctx.supabase
    .from("content_items")
    .select("id", { count: "exact", head: true })
    .eq("list", l.key);
  if (countError) return { message: dbErrorMessage(countError), values: submittedValues(fd) };
  if ((count ?? 0) >= l.def.max) return { message: `${l.def.label}은(는) 최대 ${l.def.max}개까지 둘 수 있습니다.`, values: submittedValues(fd) };

  const f = new FormReader(fd);
  const values = readItemForm(l.def, f, fd);
  if (f.hasErrors) return f.state();

  let image_url: string | null = null;
  if (l.def.columns.image) {
    image_url = await resolveImage(ctx, f, "image", "content", null);
    if (!image_url && l.def.columns.image.required && !f.errors.image) f.reject("image", `${l.def.columns.image.label}을(를) 올려 주세요.`);
    if (f.hasErrors) {
      await removeImages(ctx, [image_url]);
      return f.state();
    }
  }

  const { error } = await ctx.supabase.from("content_items").insert({ list: l.key, ...values, image_url });
  if (error) {
    await removeImages(ctx, [image_url]);
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }
  updateTag(TAGS.contentItems);
  redirect(backTo(l.key));
}

export async function updateContentItem(list: string, id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };
  const l = listOrNull(list);
  if (!l) return { message: "없는 목록입니다." };

  // 현재 행(사진 포함)은 클라이언트가 아니라 DB 에서 다시 읽는다 — 다른 목록의 행은 고칠 수 없다
  const { data: current } = await ctx.supabase
    .from("content_items")
    .select("id, image_url")
    .eq("id", id)
    .eq("list", l.key)
    .maybeSingle<Pick<ContentItemRow, "id" | "image_url">>();
  if (!current) return { message: "이미 삭제된 항목입니다." };

  const f = new FormReader(fd);
  const values = readItemForm(l.def, f, fd);
  if (f.hasErrors) return f.state();

  let image_url = current.image_url;
  if (l.def.columns.image) {
    image_url = await resolveImage(ctx, f, "image", "content", current.image_url);
    if (!image_url && l.def.columns.image.required && !f.errors.image) f.reject("image", `${l.def.columns.image.label}을(를) 올려 주세요.`);
    if (f.hasErrors) {
      if (image_url !== current.image_url) await removeImages(ctx, [image_url]);
      return f.state();
    }
  }

  const { error } = await ctx.supabase.from("content_items").update({ ...values, image_url }).eq("id", id).eq("list", l.key);
  if (error) {
    if (image_url !== current.image_url) await removeImages(ctx, [image_url]);
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }
  if (image_url !== current.image_url) await removeImages(ctx, [current.image_url]);
  updateTag(TAGS.contentItems);
  redirect(backTo(l.key));
}

export async function deleteContentItem(list: string, id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");
  const l = listOrNull(list);
  if (!l) redirect("/admin/content");

  const { data: current } = await ctx.supabase
    .from("content_items")
    .delete()
    .eq("id", id)
    .eq("list", l.key)
    .select("image_url")
    .maybeSingle<Pick<ContentItemRow, "image_url">>();
  if (current) await removeImages(ctx, [current.image_url]);
  updateTag(TAGS.contentItems);
  redirect(backTo(l.key));
}
