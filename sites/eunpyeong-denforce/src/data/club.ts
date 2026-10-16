// 구단 기본 정보. 출처: 서울은평 풋살팀 스폰서십 제안서(2025-26), 위키백과(팀명 변천·감독).
import type { ClubSettings, HistoryItem, NationalTeamAlumnus } from "@/types";

const CLUB_INTRO = [
  "서울은평 덴포스는 2012년 창단한 서울 은평구 연고의 풋살팀으로, 대한민국 풋살 세미프로 리그 FK리그에 참가하고 있습니다.",
  "2025-26 시즌을 앞두고 의류 브랜드 덴포스(Denforce)와 네이밍 스폰서 계약을 맺고 '서울은평 덴포스'로 새 출발했습니다.",
];

/** 정적 모드 기본값. DB 모드에서는 club_settings 테이블이 대신한다. */
export const CLUB_SETTINGS: ClubSettings = {
  intro: CLUB_INTRO,
  contactEmail: "futbol10@naver.com",
  contactPhone: null,
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
  { id: "h6", year: "2020", text: "FK컵 3위 · 팀명 '서울은평 나인티플러스 FC'로 변경" },
  { id: "h7", year: "2018-19", text: "FK리그 (2부, 드림리그) 우승 — 1부 승격" },
  { id: "h8", year: "2018", text: "FK컵 3위" },
  { id: "h9", year: "2017-18", text: "FK리그 (2부, 드림리그) 준우승" },
  { id: "h11", year: "2012-13", text: "FK리그 첫 참가" },
  { id: "h12", year: "2012", text: "'서울은평 FS' 창단 (11월 17일)" },
];

export const ORGANIZATION = [
  { group: "남자 성인", items: ["1군 서울은평 덴포스 (FK리그)", "2군 풋살사관학교 (생활체육)"] },
  { group: "여자 성인", items: ["1군 서울은평 위민 (FK리그 참가 목표)", "2군 풋살사관학교 레이디스 (생활체육)"] },
  { group: "유소년", items: ["U-18 (고등부)", "U-15 (중등부)", "U-12 (초등부)", "U-6 (유치부)"] },
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

export const COMMUNITY = [
  { group: "지역 연계 프로그램", items: ["다문화 청년네트워크 풋살 교육", "이미자 통합센터 풋살 교육", "그루터기 지역아동센터 풋살 교육"] },
  { group: "대회 유치", items: ["은평구청장배 풋살 대회", "서울특별시 은평구 i LEAGUE"] },
  { group: "전국 풋살 순회교육", items: ["국민체육진흥공단 파견 스포츠스타 풋살 교육"] },
];

/**
 * 엠블럼·유니폼 페이지의 지금 시즌 유니폼 — 구단 공개(2026-10-06 '26-27 서울은평덴포스 HOME & AWAY KIT 공개', 인스타그램).
 * 사진은 공개 이미지에서 홈·어웨이 상의 한 장씩(public/photos/kit-2627-*.webp). 시즌이 바뀌면 이 값과 사진을 바꾼다.
 */
export const KIT = {
  images: [
    { src: "/photos/kit-2627-home.webp", alt: "2026-27 홈 유니폼 (로열블루)", caption: "홈" },
    { src: "/photos/kit-2627-away.webp", alt: "2026-27 어웨이 유니폼 (화이트·블루 스트라이프)", caption: "어웨이" },
  ],
} as const;

export const EMBLEM_TEXT = [
  "엠블럼은 'SEOUL EUNPYEONG FUTSAL TEAM' 문구와 은평(Eunpyeong)의 머리글자 'E', 풋살공을 페넌트 형태에 담았습니다.",
  "하단의 'SINCE 2012'는 창단 연도를 뜻합니다.",
];
