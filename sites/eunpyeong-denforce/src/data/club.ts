// 구단 기본 정보. 출처: 서울은평 풋살팀 스폰서십 제안서(2025-26), 위키백과(팀명 변천·감독).
import type { ClubSettings, HistoryItem, NationalTeamAlumnus } from "@/types";

const CLUB_INTRO = [
  "서울은평 덴포스는 2012년 창단한 서울 은평구 연고의 풋살팀으로, 대한민국 풋살 세미프로 리그 FK리그에 참가하고 있습니다.",
  "2025-26 시즌을 앞두고 의류 브랜드 덴포스(Denforce)와 네이밍 스폰서 계약을 맺고 '서울은평 덴포스'로 새 출발했습니다.",
];

/** 정적 모드 기본값. DB 모드에서는 club_settings 테이블이 대신한다. */
export const CLUB_SETTINGS: ClubSettings = {
  intro: CLUB_INTRO,
  contactEmail: "jonghbae@naver.com",
  contactPhone: "010-5135-0309",
  contactAddress: null,
  instagramUrl: "https://www.instagram.com/eunpyeong_denforce",
  youtubeUrl: null,
  venueAddress: null,
  venueTransit: null,
  venueParking: null,
  ogImageUrl: null,
  adminOgImageUrl: null,
  ogTitle: null,
  ogDescription: null,
  adminOgTitle: null,
  adminOgDescription: null,
};

export const HISTORY: HistoryItem[] = [
  { id: "h1", year: "2025", text: "덴포스(Denforce) 네이밍 스폰서 계약 — 팀명 '서울은평 덴포스'로 변경" },
  { id: "h2", year: "2023", text: "팀명 '서울은평 ZD스포츠 FC'로 변경" },
  { id: "h3", year: "2021-22", text: "FK리그 (1부, 슈퍼리그) 3위" },
  { id: "h4", year: "2021", text: "FK컵 3위" },
  { id: "h5", year: "2020-21", text: "FK리그 (1부, 슈퍼리그) 준우승" },
  { id: "h6", year: "2020", text: "FK컵 3위 / 팀명 '서울은평 나인티플러스 FC'로 변경" },
  { id: "h7", year: "2018-19", text: "FK리그 (2부, 드림리그) 우승 — 1부 승격" },
  { id: "h8", year: "2018", text: "FK컵 3위" },
  { id: "h9", year: "2017-18", text: "FK리그 (2부, 드림리그) 준우승" },
  { id: "h11", year: "2012-13", text: "FK리그 첫 참가" },
  { id: "h12", year: "2012", text: "'서울은평 FS' 창단 (11월 17일)" },
];

/** 정적 모드 기본값 — DB 모드에서는 national_team_alumni 테이블(관리자 › 구단정보)이 대신한다 (D-043) */
export const NATIONAL_TEAM_ALUMNI: NationalTeamAlumnus[] = [
  { id: "a1", name: "최경진", position: "FP", years: "2013, 2014, 2017" },
  { id: "a2", name: "이우진", position: "GK", years: "2014, 2015, 2019, 2020, 2021, 2022" },
  { id: "a3", name: "전원조", position: "FP", years: "2014, 2015" },
  { id: "a4", name: "이경호", position: "GK", years: "2014" },
  { id: "a5", name: "이주섭", position: "FP", years: "2014" },
  { id: "a6", name: "박영재", position: "FP", years: "2018" },
  { id: "a7", name: "조병걸", position: "FP", years: "2018, 2019" },
  { id: "a8", name: "이안", position: "FP", years: "2018, 2021" },
  { id: "a9", name: "이준원", position: "FP", years: "2019, 2020, 2021" },
  { id: "a10", name: "이한울", position: "FP", years: "2020, 2021, 2022" },
  { id: "a11", name: "강주광", position: "FP", years: "2020, 2021, 2022" },
];

// 팀 조직·지역 활동 카드, 유니폼 시즌·사진, 엠블럼 설명·팀 색상은 관리자 › 홈페이지 내용 (기본값: src/lib/content/fields.ts·lists.ts)

/** 엠블럼 내려받기 — 원본 벡터(.ai)를 기본 팀 색상(로열블루/골드/블랙/화이트)으로 바꿔 만든 파일 (public/brand/downloads) */
export const EMBLEM_DOWNLOADS = [
  { format: "PNG", note: "투명 배경 / 2000px", href: "/brand/downloads/seoul-eunpyeong-denforce-emblem.png" },
  { format: "SVG", note: "벡터 / 웹용", href: "/brand/downloads/seoul-eunpyeong-denforce-emblem.svg" },
  { format: "PDF", note: "벡터 / 인쇄용", href: "/brand/downloads/seoul-eunpyeong-denforce-emblem.pdf" },
];
