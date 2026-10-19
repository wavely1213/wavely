// 관리자 등급 (D-057) — 메뉴/첫 화면, 글 권한, 검토 대기, 관리자 계정 화면 단위 테스트. 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { ADMIN_NAV_GROUPS, homeFor, navGroupsFor } from "../src/config/admin-nav.ts";
import { formatKstDateTime, loginStatus, mediaPermSummary, normalizeEmail, selfChangeError } from "../src/lib/admin/accounts.ts";
import { reviewAlerts } from "../src/lib/admin/alerts.ts";
import { dbErrorMessage } from "../src/lib/admin/form.ts";
import {
  ADMIN_ROLES,
  ALL_POST_PERMS,
  editBlockReason,
  flagValues,
  isAdminRole,
  isPendingReview,
  NOT_OWN_POST_MESSAGE,
  postPermsFor,
  PUBLISHED_LOCKED_MESSAGE,
  type PostPerms,
} from "../src/lib/admin/roles.ts";

const hrefs = (role: (typeof ADMIN_ROLES)[number]) => navGroupsFor(role).flatMap((g) => g.items.map((i) => i.href));
const NO_PERMS: PostPerms = { publish: false, feature: false, setDate: false, editPublished: false };
const perms0 = { can_publish: false, can_feature: false, can_set_date: false, can_edit_published: false };

test("navGroupsFor: 미디어는 구단소식/포스팅만, 관리자 계정은 최고 관리자만", () => {
  assert.deepEqual(hrefs("media"), ["/admin/news", "/admin/postings"]);
  assert.ok(hrefs("owner").includes("/admin/accounts"));
  assert.ok(!hrefs("admin").includes("/admin/accounts"));
  // 관리자 계정 말고는 최고 관리자와 관리자의 메뉴가 같다
  assert.deepEqual(hrefs("admin"), hrefs("owner").filter((h) => h !== "/admin/accounts"));
  // 빈 묶음은 없다 (구분선만 남지 않게)
  for (const r of ADMIN_ROLES) assert.ok(navGroupsFor(r).every((g) => g.items.length > 0));
});

test("homeFor: 첫 화면은 그 등급이 들어갈 수 있는 메뉴 (다시 보내기 반복 없음)", () => {
  assert.equal(homeFor("owner"), "/admin");
  assert.equal(homeFor("admin"), "/admin");
  assert.equal(homeFor("media"), "/admin/news");
  for (const r of ADMIN_ROLES) assert.ok(hrefs(r).includes(homeFor(r)));
  // 메뉴 주소가 겹치지 않는다
  const all = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));
  assert.equal(new Set(all).size, all.length);
});

test("isAdminRole / postPermsFor: 미디어만 계정별 권한", () => {
  assert.ok(isAdminRole("media"));
  assert.ok(!isAdminRole("Owner"));
  assert.ok(!isAdminRole(null));
  assert.deepEqual(postPermsFor("owner", perms0), ALL_POST_PERMS);
  assert.deepEqual(postPermsFor("admin", perms0), ALL_POST_PERMS);
  assert.deepEqual(postPermsFor("media", perms0), NO_PERMS);
  assert.deepEqual(postPermsFor("media", { ...perms0, can_set_date: true }), { ...NO_PERMS, setDate: true });
});

test("editBlockReason: 미디어는 자기 글(올린 사람 = 내 로그인 계정 ID)만, 공개된 글은 '공개된 글 고치기' 권한이 있어야 — DB 정책과 같은 규칙", () => {
  const ME = "6f1c2d3e-0000-4000-8000-000000000001";
  const OWNER = "6f1c2d3e-0000-4000-8000-000000000002";
  const media = { role: "media" as const, userId: ME, perms: NO_PERMS };
  const own = (published: boolean) => ({ published, created_by: ME });
  assert.equal(editBlockReason(media, own(false)), null);
  assert.equal(editBlockReason(media, own(true)), PUBLISHED_LOCKED_MESSAGE);
  assert.equal(editBlockReason({ ...media, perms: { ...NO_PERMS, editPublished: true } }, own(true)), null);
  // 남의 글(최고 관리자 초안, 예전 글)은 비공개여도 못 고친다
  assert.equal(editBlockReason(media, { published: false, created_by: OWNER }), NOT_OWN_POST_MESSAGE);
  assert.equal(editBlockReason(media, { published: false, created_by: null }), NOT_OWN_POST_MESSAGE);
  // 예전 방식(이메일) 기록은 내 글로 보지 않는다 (DB 에서 ID 로 바꿨다, I-042)
  assert.equal(editBlockReason(media, { published: false, created_by: "admin@eunpyeong-fs.com" }), NOT_OWN_POST_MESSAGE);
  // 최고 관리자/관리자는 모두 고친다
  for (const role of ["owner", "admin"] as const) {
    assert.equal(editBlockReason({ role, userId: OWNER, perms: ALL_POST_PERMS }, { published: true, created_by: null }), null);
  }
});

test("flagValues: 권한 없는 칸은 새 글이면 꺼짐, 고칠 때는 보내지 않음 (DB 의 지금 값 유지)", () => {
  const on = { published: true, featured: true };
  const off = { published: false, featured: false };
  assert.deepEqual(flagValues(ALL_POST_PERMS, on, true), on);
  assert.deepEqual(flagValues(ALL_POST_PERMS, off, false), off);
  assert.deepEqual(flagValues(NO_PERMS, on, true), off);
  assert.deepEqual(flagValues(NO_PERMS, off, false), {});
  assert.deepEqual(flagValues({ ...NO_PERMS, publish: true }, on, false), { published: true });
  assert.deepEqual(flagValues({ ...NO_PERMS, feature: true }, on, true), { published: false, featured: true });
});

test("isPendingReview: 최고 관리자/관리자가 아닌 계정이 올린 비공개 글 (지운 미디어 계정 포함)", () => {
  const OWNER = "6f1c2d3e-0000-4000-8000-000000000002";
  const ADMIN = "6f1c2d3e-0000-4000-8000-000000000003";
  const MEDIA = "6f1c2d3e-0000-4000-8000-000000000001";
  const admins = new Set([OWNER, ADMIN]);
  assert.ok(isPendingReview({ published: false, created_by: MEDIA }, admins));
  assert.ok(isPendingReview({ published: false, created_by: "6f1c2d3e-0000-4000-8000-0000000000ff" }, admins));
  assert.ok(!isPendingReview({ published: true, created_by: MEDIA }, admins));
  assert.ok(!isPendingReview({ published: false, created_by: OWNER }, admins));
  assert.ok(!isPendingReview({ published: false, created_by: null }, admins));
  // 미디어 계정 화면: 관리자 목록 없이도 자기 비공개 글은 검토 대기
  assert.ok(isPendingReview({ published: false, created_by: MEDIA }, new Set()));
  // 관리자 ID 목록을 못 읽으면(null) 검토 대기로 보지 않는다 — 관리자 초안이 잘못 뜨지 않게
  assert.ok(!isPendingReview({ published: false, created_by: MEDIA }, null));
});

test("dbErrorMessage: 미디어 규칙 거절은 이유 그대로, 그 밖의 권한 오류는 다시 로그인 안내", () => {
  assert.equal(dbErrorMessage({ code: "42501", message: "미디어 계정은 글을 공개할 수 없습니다 (검토 후 공개)" }), "미디어 계정은 글을 공개할 수 없습니다 (검토 후 공개)");
  assert.match(dbErrorMessage({ code: "42501", message: "permission denied for table players" }), /다시 로그인/);
});

test("reviewAlerts: 검토 대기 구단소식/포스팅", () => {
  assert.deepEqual(reviewAlerts({ news: 0, postings: 0 }), []);
  const a = reviewAlerts({ news: 2, postings: 1 });
  assert.deepEqual(
    a.map((x) => [x.level, x.title, x.href]),
    [
      ["warn", "검토 대기 구단소식 2개", "/admin/news"],
      ["warn", "검토 대기 포스팅 1개", "/admin/postings"],
    ],
  );
});

test("관리자 계정: 로그인 상태 / 권한 요약 / 내 계정 보호", () => {
  assert.deepEqual(loginStatus({ has_login: false, confirmed: false, last_sign_in_at: null }), { label: "로그인 계정 없음", ready: false });
  assert.deepEqual(loginStatus({ has_login: true, confirmed: false, last_sign_in_at: null }), { label: "이메일 인증 전", ready: false });
  assert.deepEqual(loginStatus({ has_login: true, confirmed: true, last_sign_in_at: null }), { label: "로그인한 적 없음", ready: true });
  assert.deepEqual(loginStatus({ has_login: true, confirmed: true, last_sign_in_at: "2026-10-19T06:55:08Z" }), {
    label: "마지막 로그인 2026-10-19 15:55",
    ready: true,
  });
  assert.equal(formatKstDateTime("2026-10-19T15:30:00Z"), "2026-10-20 00:30");
  assert.equal(formatKstDateTime("x"), "-");

  assert.equal(mediaPermSummary({ role: "owner", ...perms0 }), null);
  assert.equal(mediaPermSummary({ role: "media", ...perms0 }), "검토 후 공개만");
  assert.equal(mediaPermSummary({ role: "media", ...perms0, can_publish: true, can_edit_published: true }), "직접 공개, 공개된 글 고치기");

  assert.equal(normalizeEmail("  Admin@Eunpyeong-FS.com "), "admin@eunpyeong-fs.com");
  assert.equal(selfChangeError("a@x.com", "b@x.com", "media"), null);
  assert.equal(selfChangeError("A@x.com", "a@x.com", "owner"), null);
  assert.match(selfChangeError("a@x.com", "a@x.com", "admin") ?? "", /등급은 바꿀 수 없습니다/);
  assert.match(selfChangeError("a@x.com", "a@x.com", "delete") ?? "", /지울 수 없습니다/);
});
