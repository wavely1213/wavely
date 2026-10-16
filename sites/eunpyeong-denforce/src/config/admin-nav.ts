// 관리자 메뉴 — 순서대로 사이드바에 표시
export const ADMIN_NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/news", label: "구단소식" },
  { href: "/admin/postings", label: "포스팅" },
  { href: "/admin/matches", label: "경기" },
  { href: "/admin/standings", label: "리그순위" },
  { href: "/admin/players", label: "선수" },
  { href: "/admin/staff", label: "코칭스태프" },
  { href: "/admin/sponsors", label: "스폰서" },
  { href: "/admin/club", label: "구단정보" },
] as const;
