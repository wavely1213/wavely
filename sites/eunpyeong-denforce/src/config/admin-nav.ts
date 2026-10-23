// 관리자 메뉴 — 묶음별로 사이드바에 표시 (D-048). 휴대폰에서는 '메뉴' 버튼을 눌러 연다.
// 등급마다 보이는 메뉴가 다르다 (D-057) — roles 를 적지 않은 메뉴는 최고 관리자/관리자만.
import { FULL_ADMIN_ROLES, OWNER_ROLES, STAFF_ROLES, type AdminRole } from "../lib/admin/roles.ts";

export type AdminNavItem = { href: string; label: string; roles?: readonly AdminRole[] };
export type AdminNavGroup = { label: string | null; items: readonly AdminNavItem[] };

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  { label: null, items: [{ href: "/admin", label: "대시보드" }] },
  {
    label: "콘텐츠",
    items: [
      { href: "/admin/news", label: "구단소식", roles: STAFF_ROLES },
      { href: "/admin/postings", label: "포스팅", roles: STAFF_ROLES },
      // 구단 인스타그램 새 게시물을 15분마다 자동으로 넣은 기록 (D-065)
      { href: "/admin/instagram", label: "인스타 자동 반영" },
    ],
  },
  {
    label: "선수단",
    items: [
      { href: "/admin/players", label: "선수" },
      { href: "/admin/staff", label: "코칭스태프" },
    ],
  },
  {
    label: "경기",
    items: [
      { href: "/admin/matches", label: "경기" },
      { href: "/admin/standings", label: "리그순위" },
    ],
  },
  {
    label: "구단/홈페이지",
    items: [
      // 화면 곳곳의 문구·사진·카드 — 다른 메뉴가 맡지 않는 홈페이지 내용 전부 (D-046)
      { href: "/admin/content", label: "홈페이지 내용" },
      { href: "/admin/club", label: "구단정보" },
      { href: "/admin/sponsors", label: "스폰서" },
    ],
  },
  {
    label: "설정",
    items: [
      { href: "/admin/settings", label: "링크 미리보기" },
      { href: "/admin/accounts", label: "관리자 계정", roles: OWNER_ROLES },
    ],
  },
];

/** 이 등급에 보이는 메뉴 (빈 묶음은 뺀다) */
export function navGroupsFor(role: AdminRole): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => (i.roles ?? FULL_ADMIN_ROLES).includes(role)) })).filter(
    (g) => g.items.length > 0,
  );
}

/** 로그인 뒤 첫 화면 — 이 등급의 첫 메뉴 (미디어는 구단소식) */
export function homeFor(role: AdminRole): string {
  return navGroupsFor(role)[0]?.items[0]?.href ?? "/admin/login";
}

/** 지금 주소가 메뉴 항목 안인지 — 대시보드는 정확히 같을 때만 */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
