// 관리자 등급 (D-057) — 메뉴/첫 화면, 글 권한, 검토 대기, 관리자 계정 화면 단위 테스트. 실행: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { ADMIN_NAV_GROUPS, homeFor, navGroupsFor } from "../src/config/admin-nav.ts";
import { formatKstDateTime, loginStatus, mediaPermSummary, normalizeEmail, selfChangeError } from "../src/lib/admin/accounts.ts";
import { reviewAlerts } from "../src/lib/admin/alerts.ts";
import {
  ADMIN_ROLES,
  ALL_POST_PERMS,
  allowedFlags,
  canEditPost,
  isAdminRole,
  isPendingReview,
  postPermsFor,
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

test("canEditPost: 공개된 글은 '공개된 글 고치기' 권한이 있어야", () => {
  assert.ok(canEditPost(NO_PERMS, false));
  assert.ok(!canEditPost(NO_PERMS, true));
  assert.ok(canEditPost({ ...NO_PERMS, editPublished: true }, true));
  assert.ok(canEditPost(ALL_POST_PERMS, true));
});

test("allowedFlags: 권한 없는 칸은 지금 값(새 글은 꺼짐) — DB 트리거와 같은 규칙", () => {
  const on = { published: true, featured: true };
  const off = { published: false, featured: false };
  assert.deepEqual(allowedFlags(ALL_POST_PERMS, on, null), on);
  assert.deepEqual(allowedFlags(ALL_POST_PERMS, off, on), off);
  // 미디어 (권한 없음): 새 글은 비공개/고정 안 함, 고칠 때는 지금 값 그대로 (숨긴 칸이 '꺼짐'으로 넘어와도)
  assert.deepEqual(allowedFlags(NO_PERMS, on, null), off);
  assert.deepEqual(allowedFlags(NO_PERMS, off, { published: false, featured: true }), { published: false, featured: true });
  assert.deepEqual(allowedFlags({ ...NO_PERMS, publish: true }, on, off), { published: true, featured: false });
});

test("isPendingReview: 미디어 계정이 올린 비공개 글만 (대소문자 무시)", () => {
  const media = new Set(["admin@eunpyeong-fs.com"]);
  assert.ok(isPendingReview({ published: false, created_by: "Admin@Eunpyeong-fs.com" }, media));
  assert.ok(!isPendingReview({ published: true, created_by: "admin@eunpyeong-fs.com" }, media));
  assert.ok(!isPendingReview({ published: false, created_by: "owner@example.com" }, media));
  assert.ok(!isPendingReview({ published: false, created_by: null }, media));
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
