// 관리자 › 홈페이지 내용의 탭(구역) — 어떤 값·목록을 어느 화면에서 고치는지 (D-046).
// 다른 관리 메뉴(구단소식·경기·선수 등)가 맡는 내용은 related 로 이어 준다 — '총괄' 지도.
import type { ContentKey } from "./fields";
import type { ListKey } from "./lists";

export type ContentSection = {
  id: string;
  label: string;
  description: string;
  groups: ReadonlyArray<{ title: string; keys: readonly ContentKey[] }>;
  lists: readonly ListKey[];
  /** 같은 화면의 다른 내용을 고치는 관리 메뉴 */
  related: ReadonlyArray<{ href: string; label: string }>;
};

export const CONTENT_SECTIONS = [
  {
    id: "basic",
    label: "기본 정보",
    description: "구단 이름/창단일/대표/홈구장처럼 사이트 여러 곳에 함께 쓰이는 정보와 검색엔진용 설명입니다.",
    groups: [
      { title: "구단", keys: ["site.name", "site.nameEn", "site.foundedDate", "site.representative", "site.homeVenue"] },
      { title: "검색엔진", keys: ["site.description", "site.alternateNames"] },
      { title: "상단 스토어 버튼", keys: ["nav.external.label", "nav.external.href"] },
    ],
    lists: [],
    related: [
      { href: "/admin/club", label: "문의 메일/전화/사무국 주소/SNS/구장 주소/링크 미리보기 (구단정보)" },
      { href: "/admin/staff", label: "푸터 '단장' 이름 (코칭스태프 › 직책 '단장')" },
    ],
  },
  {
    id: "home",
    label: "메인",
    description: "메인 페이지 맨 위 큰 사진/슬로건과 섹션 제목, 맨 아래 바로가기 카드입니다.",
    groups: [
      { title: "맨 위 큰 사진", keys: ["home.hero.image", "home.hero.imageAlt", "home.hero.eyebrow", "home.hero.slogan"] },
      {
        title: "섹션 제목",
        keys: ["home.section.matches", "home.section.news", "home.section.standings", "home.section.players", "home.section.quicklinks"],
      },
    ],
    lists: ["home.quicklinks"],
    related: [
      { href: "/admin/sponsors", label: "스폰서 띠 로고 (스폰서)" },
      { href: "/admin/matches", label: "다음 홈경기/경기 카드 (경기)" },
      { href: "/admin/news", label: "구단 소식 (구단소식)" },
      { href: "/admin/standings", label: "리그 순위 (리그순위)" },
      { href: "/admin/players", label: "선수단 (선수)" },
    ],
  },
] as const satisfies ReadonlyArray<ContentSection>;

export type SectionId = (typeof CONTENT_SECTIONS)[number]["id"];

export function findSection(id: string): ContentSection | undefined {
  return CONTENT_SECTIONS.find((s) => s.id === id);
}

/** 목록이 속한 구역 (목록 추가·수정 화면의 '돌아가기') */
export function sectionOfList(list: ListKey): ContentSection | undefined {
  return CONTENT_SECTIONS.find((s) => (s.lists as readonly string[]).includes(list));
}
