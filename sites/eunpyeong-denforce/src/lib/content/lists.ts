// 홈페이지 내용 — 목록 (D-046). DB 표 content_items 의 list 칸으로 어느 목록인지 나눈다.
// 칸은 title·body·link·image 네 가지 중 목록마다 쓰는 것만 정한다. 정적 모드(DB 없음)에서는 defaults 를 보여 준다.

export type ListColumn = "title" | "body" | "link" | "image";

export type ColumnDef = {
  label: string;
  /** 글자 수 상한 (image 제외) */
  max?: number;
  required?: boolean;
  /** 여러 줄 입력 */
  multiline?: boolean;
  hint?: string;
};

export type ListDef = {
  label: string;
  /** 관리자 안내 — 어디에 어떻게 보이는지 */
  description: string;
  columns: Partial<Record<ListColumn, ColumnDef>>;
  /** 정적 모드 기본 목록 (DB 에는 마이그레이션이 같은 값을 넣는다) */
  defaults: ReadonlyArray<Partial<Record<ListColumn, string>>>;
  /** 최대 개수 */
  max: number;
};

export const CONTENT_LISTS = {
  "home.quicklinks": {
    label: "메인 바로가기 카드",
    description: "메인 맨 아래 '바로가기' 카드입니다. 하나도 없으면 그 섹션이 보이지 않습니다.",
    columns: {
      title: { label: "이름", max: 20, required: true },
      body: { label: "설명", max: 40, hint: "이름 아래 작은 글씨 (비워도 됩니다)" },
      link: {
        label: "주소",
        max: 300,
        required: true,
        hint: "사이트 안 페이지는 /로 시작 (예: /match/schedule), 바깥 사이트는 https:// 로 시작 — 바깥 사이트는 새 창",
      },
    },
    defaults: [
      { title: "경기일정", body: "시즌 일정/장소", link: "/match/schedule" },
      { title: "선수단", body: "선수/코칭스태프", link: "/team/players" },
      { title: "오시는 길", body: "은평다목적체육관", link: "/club/location" },
      { title: "스폰서", body: "함께하는 파트너", link: "/sponsors" },
      { title: "문의", body: "제휴/후원/입단", link: "/contact" },
    ],
    max: 12,
  },
} as const satisfies Record<string, ListDef>;

export type ListKey = keyof typeof CONTENT_LISTS;

export function isListKey(key: string): key is ListKey {
  return Object.hasOwn(CONTENT_LISTS, key);
}

export function listDef(key: ListKey): ListDef {
  return CONTENT_LISTS[key];
}

/** 목록 한 줄 (화면용) */
export type ContentItem = {
  id: string;
  list: string;
  title: string;
  body: string;
  link: string;
  image: string | null;
  sortOrder: number;
};
