// 관리자 › 홈페이지 내용의 탭(구역) — 어떤 값·목록을 어느 화면에서 고치는지 (D-046).
// 다른 관리 메뉴(구단소식·경기·선수 등)가 맡는 내용은 related 로 이어 준다 — '총괄' 지도.
import type { ContentKey } from "./fields";
import type { ListKey } from "./lists";

export type ContentSection = {
  id: string;
  label: string;
  description: string;
  /** '이 페이지 보기 ↗' — 홈페이지에서 이 내용이 보이는 곳 */
  view: string;
  groups: ReadonlyArray<{ title: string; keys: readonly ContentKey[] }>;
  lists: readonly ListKey[];
  /** 같은 화면의 다른 내용을 고치는 관리 메뉴 */
  related: ReadonlyArray<{ href: string; label: string }>;
};

export const CONTENT_SECTIONS = [
  {
    id: "common",
    label: "공통 (헤더/푸터)",
    description: "모든 페이지 맨 위 헤더와 맨 아래 푸터, 구단 이름/창단일처럼 사이트 여러 곳에 함께 쓰이는 정보, 검색엔진용 설명입니다.",
    view: "/",
    groups: [
      { title: "구단", keys: ["site.name", "site.nameEn", "site.foundedDate", "site.representative", "site.homeVenue"] },
      { title: "헤더 스토어 버튼", keys: ["nav.external.label", "nav.external.href"] },
      { title: "푸터", keys: ["footer.lines", "footer.legal", "footer.copyright"] },
      { title: "검색엔진", keys: ["site.description", "site.alternateNames"] },
    ],
    lists: ["footer.links"],
    related: [
      { href: "/admin/club", label: "문의 메일/전화/사무국 주소/SNS 주소 (구단정보)" },
      { href: "/admin/staff", label: "푸터 {단장} 이름 (코칭스태프 › 직책 '단장')" },
      { href: "/admin/settings", label: "링크 미리보기 이미지/제목/설명 (설정)" },
    ],
  },
  {
    id: "home",
    label: "메인",
    description: "메인 페이지 맨 위 큰 사진/슬로건과 섹션 제목, 맨 아래 바로가기 카드입니다.",
    view: "/",
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
  {
    id: "club",
    label: "구단소개",
    description: "구단소개 페이지의 사진과 섹션 제목, '팀 조직'/'지역 활동' 카드입니다.",
    view: "/club",
    groups: [
      { title: "사진", keys: ["club.photo", "club.photoAlt"] },
      { title: "섹션 제목", keys: ["club.section.organization", "club.section.alumni", "club.section.community"] },
    ],
    lists: ["club.organization", "club.community"],
    related: [{ href: "/admin/club", label: "소개 글/배출 풋살 국가대표 명단 (구단정보)" }],
  },
  {
    id: "emblem",
    label: "엠블럼/유니폼",
    description: "엠블럼/유니폼 페이지의 엠블럼 설명, 팀 색상(Main Color), 유니폼 시즌과 사진입니다. 엠블럼 그림과 내려받기 파일은 사이트 파일이라 여기서 바꾸지 않습니다.",
    view: "/club/emblem",
    groups: [
      { title: "엠블럼", keys: ["emblem.text"] },
      { title: "유니폼", keys: ["kit.season"] },
    ],
    lists: ["emblem.colors", "kit.images"],
    related: [
      {
        href: "/admin/news",
        label: "유니폼 탭 '유니폼 공개 소식 보기' 버튼 — 제목에 'KIT 공개' 또는 '유니폼 공개'가 들어간 가장 최근 구단뉴스로 이어집니다 (구단소식)",
      },
    ],
  },
  {
    id: "privacy",
    label: "개인정보처리방침",
    description: "푸터 맨 아래 '개인정보처리방침' 링크로 열리는 페이지 본문입니다. 처음 값 그대로면 홈페이지에는 '준비 중' 상자로 보입니다.",
    view: "/privacy",
    groups: [{ title: "본문", keys: ["privacy.body"] }],
    lists: [],
    related: [
      { href: "/admin/club", label: "문의 메일/전화 (구단정보)" },
      { href: "/admin/content/common", label: "푸터 맨 아래 링크 (공통)" },
    ],
  },
] as const satisfies ReadonlyArray<ContentSection>;

export type SectionId = (typeof CONTENT_SECTIONS)[number]["id"];

/** 예전 구역 주소 → 지금 구역 (기본 정보 → 공통, D-048) */
export const LEGACY_SECTION_IDS: Readonly<Record<string, SectionId>> = { basic: "common" };

export function findSection(id: string): ContentSection | undefined {
  return CONTENT_SECTIONS.find((s) => s.id === id);
}

/** 목록이 속한 구역 (목록 추가·수정 화면의 '돌아가기') */
export function sectionOfList(list: ListKey): ContentSection | undefined {
  return CONTENT_SECTIONS.find((s) => (s.lists as readonly string[]).includes(list));
}
