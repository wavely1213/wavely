// 사이트 고정 설정: 구단명·엠블럼·메뉴. 연락처·SNS·주소는 관리자 화면(구단정보)에서 고친다 (getClubSettings).

export const SITE = {
  name: "서울은평 덴포스",
  nameEn: "SEOUL EUNPYEONG DENFORCE FUTSAL TEAM",
  tagline: "FK리그 서울은평 풋살팀 공식 홈페이지",
  /** 공식 주소 — 링크 미리보기(og:image 등)의 절대 주소 기준 (D-024·D-025) */
  url: "https://eunpyeong-fs.com",
  /** 엠블럼 전체 (바깥 여백 투명, 134×183) */
  emblem: "/brand/emblem.png",
  /** 방패만 (SINCE 2012 제외, 134×171) — 헤더·파비콘 */
  emblemMark: "/brand/emblem-mark.png",
  founded: "2012",
  /** 창단일 (연혁 '서울은평 FS 창단 11월 17일') — 구조화 데이터용 */
  foundedDate: "2012-11-17",
  /** 같은 구단의 다른 이름 (DOMAIN_KNOWLEDGE) — 검색엔진 구조화 데이터용 */
  alternateNames: ["서울은평덴포스", "서울은평FS", "서울은평 FS", "서울은평 풋볼아카데미", "서울은평 나인티플러스", "서울은평 ZD스포츠"],
  /** 구단 대표 — 푸터 오른쪽 아래 표기 */
  representative: "최경진",
  homeVenue: "은평다목적체육관",
} as const;

/** 사이트 설명 — 검색 결과·링크 미리보기의 기본 설명 (D-025, 문구 D-040) */
export const SITE_DESCRIPTION = "대한민국 풋살 프로팀, FK리그 서울은평 덴포스 공식 홈페이지";

/**
 * /admin 주소 링크 미리보기의 기본 제목·설명 — 관리자 화면에서 바꾸지 않았을 때 (D-037·D-038).
 * 구단 이름은 관리자 › 홈페이지 내용에서 바뀔 수 있어 이름을 받아 만든다 (D-046)
 */
export function adminPreviewText(siteName: string) {
  return {
    title: `${siteName} 관리자`,
    description: `${siteName} 홈페이지 관리자 — 구단소식·경기·선수단·스폰서 관리`,
  };
}

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
      { label: "포스팅", href: "/news/posting" },
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

/**
 * 검색 사이트 소유 확인 값 — 네이버 서치어드바이저에서 받은 HTML 태그의 content 값을 넣는다 (D-027).
 * 비어 있으면 태그를 넣지 않는다. 비밀값이 아니다(공개 메타 태그).
 */
export const SEARCH_VERIFICATION: { naver: string | null } = {
  naver: "dd57673238c6ec36c8ddfd4e49d4d6a003c0c538",
};

/** 메뉴 맨 오른쪽 외부 링크 — 네이밍 스폰서 덴포스 스포츠 공식 홈페이지, 새 창 (D-019). 하위 탭·사이트맵에는 넣지 않는다 */
export const NAV_EXTERNAL = { label: "덴포스스포츠", href: "https://denforce.co.kr" } as const;

/** 현재 경로가 속한 1차 메뉴 (하위 탭 표시용) */
export function findSection(pathname: string): NavItem | undefined {
  return NAV.find((item) =>
    [item, ...(item.children ?? [])].some(
      (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
    ),
  );
}
