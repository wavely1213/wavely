"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import { removeImage, resolveImage } from "@/lib/admin/storage";
import type { NewsRow } from "@/lib/data/rows";
import { NEWS_CATEGORIES } from "@/lib/params";

// 구단소식 관리 서버 액션 — 모든 액션이 직접 관리자 권한을 확인한다 (페이지 검사에 기대지 않음).
// 순서: 권한 → 입력 검증 → 이미지 업로드 → DB 저장 → updateTag → redirect

// DB check: date ~ '^([0-9]{4}(-[0-9]{2}-[0-9]{2})?)?$' — 빈 값은 FormReader 가 패턴 검사 전에 통과시킨다
const POST_DATE = /^[0-9]{4}(-[0-9]{2}-[0-9]{2})?$/;

/**
 * 브라우저는 textarea 줄바꿈을 CRLF 로 보낸다. 길이 검사(요약 300자) 전에 LF 로 맞춰
 * DB(length) 와 같은 기준으로 세고, 본문 문단 나누기(빈 줄 기준)도 일정하게 한다.
 */
function newsReader(fd: FormData): FormReader {
  for (const name of ["summary", "body"]) {
    const v = fd.get(name);
    if (typeof v === "string") fd.set(name, v.replace(/\r\n?/g, "\n"));
  }
  return new FormReader(fd);
}

function readNews(f: FormReader) {
  return {
    category: f.choice("category", NEWS_CATEGORIES, "분류"),
    title: f.text("title", { label: "제목", max: 120 }),
    date: f.text("date", {
      label: "날짜",
      required: false,
      pattern: POST_DATE,
      patternHint: "날짜는 YYYY-MM-DD 또는 YYYY(연도만) 형식으로 입력해 주세요.",
    }),
    summary: f.text("summary", { label: "요약", max: 300, required: false }),
    body: f.text("body", { label: "본문", required: false }),
    published: f.bool("published"),
  };
}

export async function createNews(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = newsReader(fd);
  const values = readNews(f);
  if (f.hasErrors) return f.state();

  const thumbnail_url = await resolveImage(ctx, f, "thumbnail", "news", null);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("news_posts").insert({ ...values, thumbnail_url });
  if (error) {
    // 저장 실패 시 방금 올린 이미지는 고아가 되므로 지운다
    await removeImage(ctx, thumbnail_url);
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }

  updateTag(TAGS.news);
  redirect("/admin/news");
}

export async function updateNews(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 현재 값은 클라이언트가 아니라 DB 에서 다시 읽는다
  const { data: current } = await ctx.supabase
    .from("news_posts")
    .select("thumbnail_url")
    .eq("id", id)
    .maybeSingle<Pick<NewsRow, "thumbnail_url">>();
  if (!current) return { message: "이미 삭제된 항목입니다." };

  const f = newsReader(fd);
  const values = readNews(f);
  if (f.hasErrors) return f.state();

  const thumbnail_url = await resolveImage(ctx, f, "thumbnail", "news", current.thumbnail_url);
  if (f.hasErrors) return f.state();

  const { error } = await ctx.supabase.from("news_posts").update({ ...values, thumbnail_url }).eq("id", id);
  if (error) {
    // 새로 올린 이미지만 정리 (기존 이미지는 그대로 둔다)
    if (thumbnail_url !== current.thumbnail_url) await removeImage(ctx, thumbnail_url);
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }
  if (thumbnail_url !== current.thumbnail_url) await removeImage(ctx, current.thumbnail_url);

  updateTag(TAGS.news);
  redirect("/admin/news");
}

export async function deleteNews(id: string): Promise<void> {
  const ctx = await requireAdminAction();
  if (!ctx) redirect("/admin/login");

  const { data } = await ctx.supabase
    .from("news_posts")
    .delete()
    .eq("id", id)
    .select("thumbnail_url")
    .maybeSingle<Pick<NewsRow, "thumbnail_url">>();
  await removeImage(ctx, data?.thumbnail_url);
  updateTag(TAGS.news);
  redirect("/admin/news");
}
