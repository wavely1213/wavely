// 관리자 계정 화면 (최고 관리자 전용, D-057) — 순수 함수만 (테스트: admin-roles.test.ts).
// 관리자 목록(admins)은 '관리자 화면에 들어와도 되는 이메일'이다. 로그인 계정(비밀번호)은 Supabase Auth 에 따로 있다 —
// 앱에는 비밀 키를 두지 않으므로(SECURITY_GUIDELINES) 로그인 계정은 Supabase 대시보드에서 만든다.
import { MEDIA_PERMS, type AdminRole, type MediaPermColumn } from "./roles.ts";

/** public.admin_accounts() 한 줄 */
export type AdminAccountRow = {
  email: string;
  role: AdminRole;
  created_at: string;
  has_login: boolean;
  confirmed: boolean;
  last_sign_in_at: string | null;
} & Record<MediaPermColumn, boolean>;

/** 이메일 형식 (느슨하게) — 실제 확인은 로그인 계정의 이메일 인증 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** DB 는 소문자 이메일만 받는다 (admins_email_check) */
export function normalizeEmail(v: string): string {
  return v.trim().toLowerCase();
}

/** 로그인 계정 상태 — 관리자 목록에 넣어도 로그인 계정이 없거나 이메일 인증 전이면 들어올 수 없다 */
export function loginStatus(a: Pick<AdminAccountRow, "has_login" | "confirmed" | "last_sign_in_at">): { label: string; ready: boolean } {
  if (!a.has_login) return { label: "로그인 계정 없음", ready: false };
  if (!a.confirmed) return { label: "이메일 인증 전", ready: false };
  if (!a.last_sign_in_at) return { label: "로그인한 적 없음", ready: true };
  return { label: `마지막 로그인 ${formatKstDateTime(a.last_sign_in_at)}`, ready: true };
}

/** 2026-10-19 15:55 (한국 시간) */
export function formatKstDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

/** 미디어 계정의 켜진 권한 — 목록 표시용. 미디어가 아니면 null */
export function mediaPermSummary(a: Pick<AdminAccountRow, "role" | MediaPermColumn>): string | null {
  if (a.role !== "media") return null;
  const on = MEDIA_PERMS.filter((p) => a[p.column]).map((p) => p.label);
  return on.length ? on.join(", ") : "검토 후 공개만";
}

/** 내 계정은 등급을 내리거나 지울 수 없다 — 실수로 계정 관리를 못 하게 되지 않도록 (다른 최고 관리자가 한다) */
export function selfChangeError(target: string, me: string, nextRole: AdminRole | "delete"): string | null {
  if (normalizeEmail(target) !== normalizeEmail(me)) return null;
  if (nextRole === "delete") return "내 계정은 지울 수 없습니다. 다른 최고 관리자가 지워야 합니다.";
  if (nextRole !== "owner") return "내 계정의 등급은 바꿀 수 없습니다. 다른 최고 관리자가 바꿔야 합니다.";
  return null;
}
