// 구단소식. 운영 시작 전 자리표시 게시물이다.
import type { NewsCategory, NewsPost } from "@/types";

export const NEWS_CATEGORY_LABEL: Record<NewsCategory, string> = {
  notice: "공지사항",
  news: "구단뉴스",
  photo: "구단사진",
  video: "구단영상",
};

export const NEWS: NewsPost[] = [
  {
    id: "n-001",
    category: "notice",
    title: "서울은평 덴포스 공식 홈페이지 오픈 안내",
    date: "2026-10-15",
    thumbnail: null,
    images: [],
    summary: "구단 공식 홈페이지가 문을 열었습니다. 경기 일정과 구단 소식을 이곳에서 전해드립니다.",
    body: ["구단 공식 홈페이지가 문을 열었습니다.", "경기 일정, 선수단, 구단 소식을 순차적으로 채워 나가겠습니다."],
  },
  {
    id: "n-002",
    category: "news",
    title: "덴포스(Denforce)와 네이밍 스폰서 계약 체결",
    date: "2025-10-01",
    thumbnail: "/photos/kit.webp",
    images: [],
    summary: "의류 브랜드 덴포스와 네이밍 스폰서 계약을 맺고 '서울은평 덴포스'로 새 출발합니다.",
    body: ["서울은평 풋살팀이 의류 브랜드 덴포스(Denforce)와 네이밍 스폰서 계약을 체결했습니다.", "팀명은 '서울은평 덴포스'로 변경됩니다."],
  },
  {
    id: "p-001",
    category: "photo",
    title: "2018-19 FK리그 드림리그 우승",
    date: "2019",
    thumbnail: "/photos/hero-dreamleague-2019.webp",
    images: [],
    summary: "드림리그 우승으로 1부 리그 승격을 확정했습니다.",
    body: ["2018-19 FK리그 드림리그(2부) 우승 기념 사진입니다."],
  },
  {
    id: "p-002",
    category: "photo",
    title: "2020-21 FK리그 슈퍼리그 준우승",
    date: "2021",
    thumbnail: "/photos/superleague-2021-runnerup.webp",
    images: [],
    summary: "승격 첫 시즌 슈퍼리그 준우승을 차지했습니다.",
    body: ["2020-21 FK리그 슈퍼리그(1부) 준우승 기념 사진입니다."],
  },
  {
    id: "p-003",
    category: "photo",
    title: "U-15 유소년팀 창단",
    date: "",
    thumbnail: "/photos/u15.webp",
    images: [],
    summary: "아카데미 산하 U-15 유소년팀이 창단했습니다.",
    body: ["서울은평 U-15 유소년팀 창단식 사진입니다."],
  },
];
