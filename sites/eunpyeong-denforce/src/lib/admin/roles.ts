// 관리자 등급 (D-057) — DB admins.role 과 같은 값. 실제로 막는 것은 DB(RLS/트리거)이고, 앱은 메뉴와 입력 칸을 고른다.
// 순수 함수 (테스트: admin-roles.test.ts). 클라이언트 컴포넌트에서도 쓴다.

export const ADMIN_ROLES = ["owner", "admin", "media"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  owner: "최고 관리자",
  admin: "관리자",
  media: "미디어",
};

export const ADMIN_ROLE_HINT: Record<AdminRole, string> = {
  owner: "모든 메뉴 + 관리자 계정 추가/변경/삭제",
  admin: "모든 메뉴 (관리자 계정 관리는 빼고)",
  media: "구단소식/포스팅 글과 사진만 올립니다. 아래 권한을 켜지 않으면 '검토 대기'(비공개)로만 저장되고, 최고 관리자가 확인한 뒤 공개합니다.",
};

/** 관리자 화면에 들어오는 모든 등급 (구단소식/포스팅) */
export const STAFF_ROLES: readonly AdminRole[] = ADMIN_ROLES;
/** 최고 관리자 + 관리자 — 따로 정하지 않은 관리자 화면은 모두 이것 */
export const FULL_ADMIN_ROLES: readonly AdminRole[] = ["owner", "admin"];
/** 관리자 계정 관리 */
export const OWNER_ROLES: readonly AdminRole[] = ["owner"];

export function isAdminRole(v: unknown): v is AdminRole {
  return typeof v === "string" && (ADMIN_ROLES as readonly string[]).includes(v);
}

/** 글 권한 — 미디어 계정은 최고 관리자가 계정마다 고른다 (DB admins.can_*). 최고 관리자/관리자는 모두 가능 */
export type PostPerms = { publish: boolean; feature: boolean; setDate: boolean; editPublished: boolean };

export const ALL_POST_PERMS: PostPerms = { publish: true, feature: true, setDate: true, editPublished: true };

export const MEDIA_PERMS: ReadonlyArray<{ key: keyof PostPerms; column: MediaPermColumn; label: string; hint: string }> = [
  { key: "publish", column: "can_publish", label: "직접 공개", hint: "검토 없이 바로 홈페이지에 공개할 수 있습니다." },
  { key: "feature", column: "can_feature", label: "메인 배너 고정", hint: "구단소식 맨 위 메인 배너에 고정할 수 있습니다." },
  { key: "setDate", column: "can_set_date", label: "글 날짜 정하기", hint: "끄면 구단소식 날짜가 저장한 날로 정해집니다." },
  { key: "editPublished", column: "can_edit_published", label: "공개된 글 고치기", hint: "공개된 글을 고치거나 지울 수 있습니다." },
];

export type MediaPermColumn = "can_publish" | "can_feature" | "can_set_date" | "can_edit_published";

/** 지금 계정의 글 권한 — 미디어만 계정별 권한, 나머지는 모두 가능 */
export function postPermsFor(role: AdminRole, row: Record<MediaPermColumn, boolean>): PostPerms {
  if (role !== "media") return ALL_POST_PERMS;
  return {
    publish: row.can_publish,
    feature: row.can_feature,
    setDate: row.can_set_date,
    editPublished: row.can_edit_published,
  };
}

/** 글을 고치려는 사람 — 등급/로그인 계정 ID/글 권한 (AdminContext 와 같은 모양) */
export type PostEditor = { role: AdminRole; userId: string; perms: PostPerms };
/** 고칠지 판단에 쓰는 글 정보 — created_by: DB 가 저장할 때 넣는 올린 사람의 로그인 계정 ID (이전 글은 null, I-042) */
export type PostOwnerInfo = { published: boolean; created_by: string | null };

export const NOT_OWN_POST_MESSAGE = "다른 계정이 올린 글은 고칠 수 없습니다.";
export const PUBLISHED_LOCKED_MESSAGE = "공개된 글은 고칠 수 없습니다. 최고 관리자에게 요청해 주세요.";

/**
 * 이 글을 고치거나 지울 수 없는 이유 (고칠 수 있으면 null) — DB 정책과 같은 규칙.
 * 미디어 계정은 자기가 올린 글만, 공개된 글은 '공개된 글 고치기' 권한이 있어야 한다 (D-057).
 */
export function editBlockReason(editor: PostEditor, post: PostOwnerInfo): string | null {
  if (editor.role !== "media") return null;
  if (post.created_by === null || post.created_by !== editor.userId) return NOT_OWN_POST_MESSAGE;
  if (post.published && !editor.perms.editPublished) return PUBLISHED_LOCKED_MESSAGE;
  return null;
}

export type PostFlags = { published: boolean; featured: boolean };

/**
 * 저장할 공개/배너 값 — 권한이 없는 칸은 새 글이면 꺼짐, 고칠 때는 아예 보내지 않아 DB 의 지금 값이 그대로 남는다
 * (DB 트리거 news_media_rules/postings_media_rules 와 같은 규칙). 화면에서 숨긴 칸이 '꺼짐'으로 넘어와 켜진 값을 끄거나,
 * 저장하는 사이 최고 관리자가 바꾼 값을 되돌리지 않게.
 */
export function flagValues(perms: PostPerms, wanted: PostFlags, isNew: boolean): Partial<PostFlags> {
  const out: Partial<PostFlags> = {};
  if (perms.publish) out.published = wanted.published;
  else if (isNew) out.published = false;
  if (perms.feature) out.featured = wanted.featured;
  else if (isNew) out.featured = false;
  return out;
}

/**
 * 검토 대기 — 아직 공개하지 않은 글 가운데 최고 관리자/관리자가 아닌 계정(미디어, 지운 미디어 계정 포함)이 올린 글.
 * adminIds: 최고 관리자/관리자 로그인 계정 ID (미디어 계정 화면에서는 빈 목록 — 미디어는 자기 글만 보인다).
 * null(목록을 못 읽음)이면 검토 대기로 보지 않는다.
 */
export function isPendingReview(post: PostOwnerInfo, adminIds: ReadonlySet<string> | null): boolean {
  return adminIds !== null && !post.published && post.created_by !== null && !adminIds.has(post.created_by);
}
