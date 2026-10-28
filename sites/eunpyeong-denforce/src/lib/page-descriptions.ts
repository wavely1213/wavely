// 페이지마다 다른 검색 설명(meta description) — 순수 함수 (테스트: page-descriptions.test.ts)
// 사이트 공통 설명(관리자 › 기본 정보 '사이트 설명')은 홈과 여기 없는 페이지에만 쓰인다.
// 링크 미리보기 설명(og:description)은 페이지가 따로 정하지 않으면 Next 가 이 설명을 그대로 쓴다.
// 화면에 보이는 글이므로 중간점 대신 슬래시 (D-047).
import type { NewsCategory } from "@/types";

export type DescriptionPath =
  | "/club"
  | "/club/history"
  | "/club/emblem"
  | "/club/location"
  | "/team/players"
  | "/team/staff"
  | "/match/schedule"
  | "/match/results"
  | "/match/standings"
  | "/news"
  | "/news/posting"
  | "/sponsors"
  | "/contact"
  | "/privacy"
  | "/sitemap";

/** 설명에 넣는 값 — 구단 이름·홈구장은 관리자 › 기본 정보, 시즌은 config/league */
export type DescriptionInput = { club: string; homeVenue: string; competition: string };

const DESCRIPTIONS: Record<DescriptionPath, (v: DescriptionInput) => string> = {
  "/club": (v) => `${v.club} 구단소개 - 구단 이야기, 팀 조직, 배출 풋살 국가대표, 지역 활동`,
  "/club/history": (v) => `${v.club} 연혁 - 창단부터 지금까지의 발자취`,
  "/club/emblem": (v) => `${v.club} 엠블럼/유니폼 - 엠블럼 상징과 구단 색상 코드, 엠블럼 파일 내려받기, 시즌 유니폼`,
  "/club/location": (v) => `${v.club} 오시는 길 - 홈구장 ${v.homeVenue} 위치와 대중교통, 주차 안내`,
  "/team/players": (v) => `${v.club} 선수단 - 골레이로/픽소/아라/피보 포지션별 선수 소개`,
  "/team/staff": (v) => `${v.club} 코칭스태프와 프런트 소개`,
  "/match/schedule": (v) => `${v.club} 경기일정 - ${v.competition} 경기 날짜와 시간, 장소`,
  "/match/results": (v) => `${v.club} 경기결과 - 지난 경기 결과와 점수`,
  "/match/standings": (v) => `${v.club} 리그순위 - ${v.competition} 순위표와 지난 리그 최종 순위`,
  "/news": (v) => `${v.club} 구단소식 - 공지사항, 구단뉴스, 구단사진, 구단영상, 포스팅`,
  "/news/posting": (v) => `${v.club} 포스팅 - 구단을 다룬 구단 글/기사/팬 포스팅 모음`,
  "/sponsors": (v) => `${v.club} 스폰서 - 함께하는 후원사와 스폰서십 안내`,
  "/contact": (v) => `${v.club} 문의 - 스폰서십/제휴, 아카데미/유소년, 언론/취재 문의 연락처`,
  "/privacy": (v) => `${v.club} 홈페이지 개인정보처리방침`,
  "/sitemap": (v) => `${v.club} 홈페이지 전체 메뉴`,
};

export function pageDescription(path: DescriptionPath, v: DescriptionInput): string {
  return DESCRIPTIONS[path](v);
}

/** 지난 리그 최종 순위 페이지 — '2024-25 FK1리그' */
export function pastLeagueDescription(club: string, season: string): string {
  return `${club} ${season} 최종 순위와 경기 결과`;
}

/** 구단소식 분류 페이지 */
const NEWS_CATEGORY_TEXT: Record<NewsCategory, string> = {
  notice: "공지사항 - 구단이 알리는 공지 모음",
  news: "구단뉴스 - 선수 영입/이적과 구단 소식",
  photo: "구단사진 - 구단이 올린 사진 모음",
  video: "구단영상 - 구단이 올린 영상 모음",
};
export function newsCategoryDescription(club: string, category: NewsCategory): string {
  return `${club} ${NEWS_CATEGORY_TEXT[category]}`;
}
