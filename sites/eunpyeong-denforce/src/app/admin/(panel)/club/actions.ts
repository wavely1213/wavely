"use server";

import { updateTag } from "next/cache";
import { TAGS } from "@/lib/cache-tags";
import { NOT_ADMIN_MESSAGE, requireAdminAction } from "@/lib/admin/auth";
import { dbErrorMessage, FormReader, submittedValues, type ActionState } from "@/lib/admin/form";
import type { ClubSettingsRow } from "@/lib/data/rows";

// 구단정보(club_settings, 단일 행 id=1) 서버 액션 — 직접 관리자 권한을 확인한다 (페이지 검사에 기대지 않음).
// 순서: 권한 → 입력 검증 → DB 저장(upsert) → updateTag. 저장 후 같은 화면에 머문다 (redirect 없음).

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEXTAREAS = ["intro", "venue_transit", "venue_parking"] as const;

/**
 * 브라우저는 textarea 줄바꿈을 CRLF 로 보낸다. 길이 검사 전에 LF 로 맞춰
 * DB(length) 와 같은 기준으로 세고, 소개 문단 나누기(빈 줄 기준)도 일정하게 한다.
 */
function clubReader(fd: FormData): FormReader {
  for (const name of TEXTAREAS) {
    const v = fd.get(name);
    if (typeof v === "string") fd.set(name, v.replace(/\r\n?/g, "\n"));
  }
  return new FormReader(fd);
}

/** 빈 선택 값은 null (optText). intro 는 DB 에서 not null 이라 필수로 받는다. */
function readClubSettings(f: FormReader): ClubSettingsRow {
  return {
    intro: f.text("intro", { label: "구단 소개" }),
    contact_email: f.optText("contact_email", {
      label: "문의 이메일",
      max: 254,
      pattern: EMAIL,
      patternHint: "이메일 형식이 올바르지 않습니다. 예: name@example.com",
    }),
    contact_phone: f.optText("contact_phone", { label: "문의 전화", max: 30 }),
    contact_address: f.optText("contact_address", { label: "연락처 주소", max: 120 }),
    instagram_url: f.optUrl("instagram_url", "인스타그램 주소"),
    youtube_url: f.optUrl("youtube_url", "유튜브 주소"),
    venue_address: f.optText("venue_address", { label: "홈구장 주소", max: 120 }),
    venue_transit: f.optText("venue_transit", { label: "대중교통 안내", max: 300 }),
    venue_parking: f.optText("venue_parking", { label: "주차 안내", max: 300 }),
  };
}

/** 저장한 값을 폼 기본값으로 돌려준다 — 폼 초기화가 예전 값으로 되돌리지 않게 (null → "") */
function toFormValues(values: ClubSettingsRow): Record<string, string> {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v ?? ""]));
}

export async function saveClubSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireAdminAction();
  if (!ctx) return { message: NOT_ADMIN_MESSAGE };

  const f = clubReader(fd);
  const values = readClubSettings(f);
  if (f.hasErrors) return f.state();

  // 행이 없으면 만들고, 있으면 고친다 (단일 행 id=1 — RLS 상 삭제는 불가)
  const { error } = await ctx.supabase.from("club_settings").upsert({ id: 1, ...values });
  if (error) return { message: dbErrorMessage(error), values: submittedValues(fd) };

  updateTag(TAGS.club);
  return { ok: true, message: "저장했습니다.", values: toFormValues(values) };
}
