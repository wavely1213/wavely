// 사이트 고정 설정: 구단명·엠블럼·메뉴. 연락처·SNS·주소는 관리자 화면(구단정보)에서 고친다 (getClubSettings).

export const SITE = {
  name: "서울은평 덴포스",
  nameEn: "SEOUL EUNPYEONG FUTSAL TEAM",
  tagline: "FK리그 서울은평 풋살팀 공식 홈페이지",
  /** 엠블럼 전체 (바깥 여백 투명, 134×183) */
  emblem: "/brand/emblem.png",
  /** 방패만 (SINCE 2012 제외, 134×171) — 헤더·파비콘 */
  emblemMark: "/brand/emblem-mark.png",
  founded: "2012",
  homeVenue: "은평다목적체육관",
} as const;

export type NavItem = { label: string; href: string; children?: NavItem[] };

export const NAV: NavItem[] = [
  {
    label: "구단",
    href: "/club",
    children: [
      { label: "구단소개", href: "/club" },
      { label: "연혁", href: "/club/history" },
      { label: "엠블럼·유니폼", href: "/club/emblem" },
      { label: "오시는 길", href: "/club/location" },
    ],
  },
  {
    label: "구단소식",
    href: "/news",
    children: [
      { label: "전체", href: "/news" },
      { label: "공지사항", href: "/news/notice" },
      { label: "구단뉴스", href: "/news/news" },
      { label: "구단사진", href: "/news/photo" },
      { label: "구단영상", href: "/news/video" },
    ],
  },
  {
    label: "선수단",
    href: "/team/players",
    children: [
      { label: "선수", href: "/team/players" },
      { label: "코칭스태프", href: "/team/staff" },
    ],
  },
  {
    label: "경기",
    href: "/match/schedule",
    children: [
      { label: "경기일정", href: "/match/schedule" },
      { label: "경기결과", href: "/match/results" },
      { label: "리그순위", href: "/match/standings" },
    ],
  },
  { label: "스폰서", href: "/sponsors" },
  { label: "문의", href: "/contact" },
];

/** 현재 경로가 속한 1차 메뉴 (하위 탭 표시용) */
export function findSection(pathname: string): NavItem | undefined {
  return NAV.find((item) =>
    [item, ...(item.children ?? [])].some(
      (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
    ),
  );
}
