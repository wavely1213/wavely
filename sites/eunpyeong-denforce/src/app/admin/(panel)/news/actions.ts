"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import { MAX_NEWS_IMAGES } from "@/lib/admin/image-list";
import { allowedFlags, canEditPost, PUBLISHED_LOCKED_MESSAGE, STAFF_ROLES, type PostPerms } from "@/lib/admin/roles";
import { removeImages, resolveImage, resolveImages } from "@/lib/admin/storage";
import type { NewsRow } from "@/lib/data/rows";
import { NEWS_CATEGORIES } from "@/lib/params";
import { parseVideoUrl } from "@/lib/video";

// 구단소식 관리 서버 액션 — 모든 액션이 직접 관리자 권한을 확인한다 (페이지 검사에 기대지 않음).
// 순서: 권한 → 입력 검증 → 이미지 업로드 → DB 저장 → updateTag → redirect
// 이미지: thumbnail(목록 카드용 한 장) + images(상세 사진 여러 장, D-017)
// 미디어 계정도 쓴다 (D-057) — 권한이 없는 칸(공개/배너/날짜)은 지금 값으로 두고, DB 트리거가 한 번 더 막는다.

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
    video_url: readVideoUrl(f),
    featured: f.bool("featured"),
    published: f.bool("published"),
  };
}

type NewsFlags = Pick<NewsRow, "published" | "featured">;

/** 권한 밖의 칸은 지금 값으로 — 날짜 권한이 없으면 날짜를 보내지 않는다 (DB 가 새 글은 오늘, 고칠 때는 그대로로 정한다) */
function limitNews(values: ReturnType<typeof readNews>, perms: PostPerms, current: NewsFlags | null) {
  const { date, ...rest } = values;
  return { ...rest, ...allowedFlags(perms, values, current), ...(perms.setDate ? { date } : {}) };
}

/** 구단영상 주소 (선택) — 유튜브·인스타그램만, 글 상세에서 재생 (D-035) */
function readVideoUrl(f: FormReader): string | null {
  const v = f.optText("video_url", { label: "영상 주소", max: 300 });
  if (v && !parseVideoUrl(v)) f.reject("video_url", "유튜브(watch/shorts/youtu.be) 또는 인스타그램(게시물/릴스) https 주소만 넣을 수 있습니다.");
  return v;
}

export async function createNews(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction(STAFF_ROLES);
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = newsReader(fd);
  const values = limitNews(readNews(f), ctx.perms, null);
  if (f.hasErrors) return f.state();

  const thumbnail_url = await resolveImage(ctx, f, "thumbnail", "news", null);
  const images = await resolveImages(ctx, f, "images", "news", [], MAX_NEWS_IMAGES);
  // 저장하지 못하면 방금 올린 이미지는 고아가 되므로 지운다 (한쪽 필드만 실패한 경우 포함)
  const uploaded = [thumbnail_url, ...images.uploaded];
  if (f.hasErrors) {
    await removeImages(ctx, uploaded);
    return f.state();
  }

  const { error } = await ctx.supabase.from("news_posts").insert({ ...values, thumbnail_url, images: images.urls });
  if (error) {
    await removeImages(ctx, uploaded);
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }

  updateTag(TAGS.news);
  redirect("/admin/news");
}

export async function updateNews(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction(STAFF_ROLES);
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  // 현재 값은 클라이언트가 아니라 DB 에서 다시 읽는다
  const { data: current } = await ctx.supabase
    .from("news_posts")
    .select("thumbnail_url, images, published, featured")
    .eq("id", id)
    .maybeSingle<Pick<NewsRow, "thumbnail_url" | "images" | "published" | "featured">>();
  if (!current) return { message: "이미 삭제된 항목입니다." };
  if (!canEditPost(ctx.perms, current.published)) return { message: PUBLISHED_LOCKED_MESSAGE };

  const f = newsReader(fd);
  const values = limitNews(readNews(f), ctx.perms, current);
  if (f.hasErrors) return f.state();

  const thumbnail_url = await resolveImage(ctx, f, "thumbnail", "news", current.thumbnail_url);
  const images = await resolveImages(ctx, f, "images", "news", current.images ?? [], MAX_NEWS_IMAGES);
  const thumbnailChanged = thumbnail_url !== current.thumbnail_url;
  // 실패 시 새로 올린 이미지만 정리 (기존 이미지는 그대로 둔다)
  const uploaded = [thumbnailChanged ? thumbnail_url : null, ...images.uploaded];
  if (f.hasErrors) {
    await removeImages(ctx, uploaded);
    return f.state();
  }

  const { error } = await ctx.supabase
    .from("news_posts")
    .update({ ...values, thumbnail_url, images: images.urls })
    .eq("id", id);
  if (error) {
    await removeImages(ctx, uploaded);
    return { message: dbErrorMessage(error), values: submittedValues(fd) };
  }
  // 저장이 끝난 뒤에 바뀐 기존 이미지를 지운다
  await removeImages(ctx, [thumbnailChanged ? current.thumbnail_url : null, ...images.removed]);

  updateTag(TAGS.news);
  redirect("/admin/news");
}

export async function deleteNews(id: string): Promise<void> {
  const ctx = await requireAdminAction(STAFF_ROLES);
  if (!ctx) redirect("/admin/login");
  // 공개된 글은 권한이 있어야 지운다 (DB 정책도 같은 규칙 — 여기서는 사진을 지우기 전에 멈춘다)
  const { data: current } = await ctx.supabase.from("news_posts").select("published").eq("id", id).maybeSingle<NewsFlags>();
  if (current && !canEditPost(ctx.perms, current.published)) redirect(`/admin/news/${id}`);

  const { data } = await ctx.supabase
    .from("news_posts")
    .delete()
    .eq("id", id)
    .select("thumbnail_url, images")
    .maybeSingle<Pick<NewsRow, "thumbnail_url" | "images">>();
  await removeImages(ctx, [data?.thumbnail_url, ...(data?.images ?? [])]);
  updateTag(TAGS.news);
  redirect("/admin/news");
}
