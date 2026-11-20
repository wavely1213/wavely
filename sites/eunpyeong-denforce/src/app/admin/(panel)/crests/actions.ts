"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import { imageSize } from "@/lib/admin/image-size";
import { CREST_IMAGE_ACCEPT, removeImages, resolveImage } from "@/lib/admin/storage";
import { TAGS } from "@/lib/cache-tags";

// 상대팀 엠블럼 (D-094, I-048) — 관리자가 올린 줄이 코드 목록(src/config/team-crests.ts)의 같은 팀을 덮는다.
// 파일: 직접 올리기(media/crests/) 또는 드라이브 자료함(media/drive/, 투명 원본 그대로). 투명 PNG/WebP 만, 크기는 파일 머리에서 읽는다.

const PAGE = "/admin/crests";

type CrestRow = { file_url: string | null; file_on_light_url: string | null; width: number | null; height: number | null };

/** 쉼표나 줄바꿈으로 나눈 별칭 (최대 10, 겹침 제거) */
function parseAliases(raw: string | null, name: string): string[] {
  return [...new Set((raw ?? "").split(/[,\n]/).map((s) => s.trim()).filter((s) => s && s !== name))].slice(0, 10);
}

async function sizeOf(url: string): Promise<ReturnType<typeof imageSize>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return imageSize(new Uint8Array(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

const NOT_TRANSPARENT = "투명 바탕 PNG/WebP 엠블럼만 쓸 수 있습니다. 구단에서 받은 원본 파일을 골라 주세요.";

export async function saveCrest(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = new FormReader(fd);
  const name = f.text("name", { label: "팀 이름", max: 40 });
  const aliases = parseAliases(f.optText("aliases", { label: "다른 이름", max: 400 }), name);
  const source = f.optText("source", { label: "받은 곳", max: 300 });
  const note = f.optText("note", { label: "메모", max: 500 }) ?? "";
  if (f.hasErrors) return f.state();

  let current: CrestRow | null = null;
  if (id) {
    const { data, error } = await ctx.supabase.from("team_crests").select("file_url, file_on_light_url, width, height").eq("id", id).maybeSingle<CrestRow>();
    if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };
    if (!data) return { message: "엠블럼을 찾을 수 없습니다. 목록에서 다시 열어 주세요." };
    current = data;
  }

  const file_url = await resolveImage(ctx, f, "file", "crests", current?.file_url ?? null, CREST_IMAGE_ACCEPT);
  const file_on_light_url = await resolveImage(ctx, f, "file_on_light", "crests", current?.file_on_light_url ?? null, CREST_IMAGE_ACCEPT);
  const fresh = [file_url !== (current?.file_url ?? null) ? file_url : null, file_on_light_url !== (current?.file_on_light_url ?? null) ? file_on_light_url : null];

  // 새 파일은 머리에서 크기를 읽는다 — 드라이브에서 가져온 사진(JPG 로 바뀐 썸네일 등)이면 여기서 막힌다
  let width = current?.width ?? null;
  let height = current?.height ?? null;
  if (!file_url) {
    width = null;
    height = null;
  } else if (fresh[0]) {
    const size = await sizeOf(file_url);
    if (!size) f.reject("file", NOT_TRANSPARENT);
    else ({ width, height } = size);
  }
  if (fresh[1] && !(await sizeOf(fresh[1]))) f.reject("file_on_light", NOT_TRANSPARENT);

  if (f.hasErrors) {
    await removeImages(ctx, fresh);
    return f.state();
  }

  const values = { name, aliases, source, note, file_url, file_on_light_url, width, height, updated_at: new Date().toISOString() };
  const { error } = id ? await ctx.supabase.from("team_crests").update(values).eq("id", id) : await ctx.supabase.from("team_crests").insert(values);
  if (error) {
    await removeImages(ctx, fresh);
    return {
      message: error.code === "23505" ? "같은 이름의 엠블럼이 이미 있습니다. 목록에서 그 팀을 고쳐 주세요." : dbErrorMessage(error),
      values: submittedValues(fd),
    };
  }
  // 바뀐 옛 파일 (우리 저장소에 올린 것만 지워진다, 드라이브 자료함 파일은 남는다)
  await removeImages(ctx, [
    current?.file_url !== file_url ? current?.file_url : null,
    current?.file_on_light_url !== file_on_light_url ? current?.file_on_light_url : null,
  ]);
  updateTag(TAGS.crests);
  redirect(PAGE);
}

/** 관리자 줄 지우기 — 코드 목록에 그 팀이 있으면 기본값으로 돌아간다 */
export async function deleteCrest(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");
  const { data } = await ctx.supabase.from("team_crests").select("file_url, file_on_light_url").eq("id", id).maybeSingle<CrestRow>();
  const { error } = await ctx.supabase.from("team_crests").delete().eq("id", id);
  if (!error && data) await removeImages(ctx, [data.file_url, data.file_on_light_url]);
  updateTag(TAGS.crests);
  redirect(PAGE);
}
