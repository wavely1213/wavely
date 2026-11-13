"use server";

import { requireAdminAction } from "./auth";
import type { DriveImportResult, DriveListing, DrivePurpose, DriveResponse } from "./drive";
import { STAFF_ROLES } from "./roles";

// 드라이브 자료함 서버 액션 (D-081) — 관리자 로그인 토큰을 붙여 서버 함수 drive-library 를 부른다.
// 키, 폴더 확인, 등급 확인은 함수 안에서 한다 (여기서도 관리자 화면 등급은 먼저 본다).

const FUNCTION = "drive-library";
const NOT_REACHED = "드라이브 자료함 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";

async function callDrive<T>(body: Record<string, unknown>): Promise<DriveResponse<T>> {
  const ctx = await requireAdminAction(STAFF_ROLES);
  if (!ctx) return { ok: false, error: "관리자 로그인이 필요합니다. 다시 로그인해 주세요." };
  const { data, error } = await ctx.supabase.functions.invoke(FUNCTION, { body });
  if (!error) return { ok: true, data: data as T };
  // 함수가 돌려준 안내 문구 (키 미설정, 폴더 미연결, 공유 안 됨 등)
  const res = (error as { context?: unknown }).context;
  if (res instanceof Response) {
    try {
      const j = (await res.json()) as { error?: unknown };
      if (typeof j.error === "string" && j.error) return { ok: false, error: j.error };
    } catch {
      // 본문이 JSON 이 아니면 아래 기본 문구
    }
  }
  return { ok: false, error: NOT_REACHED };
}

export async function listDrive(folderId?: string, pageToken?: string): Promise<DriveResponse<DriveListing>> {
  return callDrive<DriveListing>({ action: "list", folderId, pageToken });
}

export async function importDrive(fileIds: string[], purpose: DrivePurpose): Promise<DriveResponse<DriveImportResult[]>> {
  const r = await callDrive<{ results: DriveImportResult[] }>({ action: "import", fileIds, purpose });
  return r.ok ? { ok: true, data: r.data.results } : r;
}
