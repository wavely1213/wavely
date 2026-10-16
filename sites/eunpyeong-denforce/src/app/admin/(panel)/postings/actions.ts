"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import { removeImage, resolveImage } from "@/lib/admin/storage";
import { POSTING_KINDS, POSTING_PLATFORMS } from "@/lib/postings";

// 포스팅(바깥 글 모음) 관리 서버 액션 — 모든 액션이 직접 관리자 권한을 확인한다 (D-022).
// 순서: 권한 → 입력 검증 → 이미지 업로드 → DB 저장 → updateTag → redirect

// 브라우저는 textarea 줄바꿈을 CRLF 로 보낸다 — 글자 수 검사·저장을 화면과 맞추려고 LF 로 바꾼다 (구단소식과 같음)
function postingReader(fd: FormData): FormReader {
  const v = fd.get("excerpt");
  if (typeof v === "string") fd.set("excerpt", v.replace(/\r\n?/g, "\n"));
  return new FormReader(fd);
}

function readPosting(f: FormReader) {
  return {
    kind: f.choice("kind", POSTING_KINDS, "분류"),
    platform: f.choice("platform", POSTING_PLATFORMS, "출처"),
    title: f.text("title", { label: "제목", max: 200 }),
    author: f.optText("author", { label: "작성자", max: 60 }) ?? "",
    url: f.url("url", "원문 주소"),
    posted_on: f.date("posted_on", "날짜"),
    excerpt: f.optText("excerpt", { label: "요약", max: 300 }) ?? "",
    published: f.bool("published"),
  };
}

export async function createPosting(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = postingReader(fd);
  const values = readPosting(f);
  if (f.hasErrors) return f.state();

  const thumbnail_url = await resolveImage(ctx, f, "thumbnail", "postings", null);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("postings").insert({ ...values, thumbnail_url });
  if (error) {
    await removeImage(ctx, thumbnail_url); // 방금 올린 파일이 고아로 남지 않게
    return { message: postingErrorMessage(error), values: submittedValues(fd) };
  }

  updateTag(TAGS.postings);
  redirect("/admin/postings");
}

export async function updatePosting(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 현재 값은 클라이언트가 아니라 DB 에서 다시 읽는다
  const { data: current } = await ctx.supabase.from("postings").select("thumbnail_url").eq("id", id).maybeSingle();
  if (!current) return { message: "이미 삭제된 글입니다." };

  const f = postingReader(fd);
  const values = readPosting(f);
  if (f.hasErrors) return f.state();

  const thumbnail_url = await resolveImage(ctx, f, "thumbnail", "postings", current.thumbnail_url);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("postings").update({ ...values, thumbnail_url }).eq("id", id);
  if (error) {
    if (thumbnail_url !== current.thumbnail_url) await removeImage(ctx, thumbnail_url);
    return { message: postingErrorMessage(error), values: submittedValues(fd) };
  }
  if (thumbnail_url !== current.thumbnail_url) await removeImage(ctx, current.thumbnail_url);

  updateTag(TAGS.postings);
  redirect("/admin/postings");
}

export async function deletePosting(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");

  const { data } = await ctx.supabase.from("postings").delete().eq("id", id).select("thumbnail_url").maybeSingle();
  await removeImage(ctx, data?.thumbnail_url);
  updateTag(TAGS.postings);
  redirect("/admin/postings");
}

/** 원문 주소는 하나에 글 하나 (postings_url_key) */
function postingErrorMessage(error: { code?: string; message?: string }) {
  return error.code === "23505" ? "같은 원문 주소의 글이 이미 있습니다." : dbErrorMessage(error);
}
