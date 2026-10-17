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
  /** lines: 한 줄에 하나(빈 줄·앞뒤 공백 정리) · hex: 색 코드 '#RRGGBB'(대문자로 맞춤) */
  format?: "lines" | "hex";
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

/** 카드 목록(팀 조직·지역 활동) 칸 — 카드 이름 + 항목(한 줄에 하나) */
const CARD_COLUMNS = {
  title: { label: "카드 이름", max: 20, required: true },
  body: { label: "항목", max: 1000, required: true, multiline: true, format: "lines", hint: "한 줄에 하나 — 카드 안 목록으로 보입니다" },
} as const satisfies ListDef["columns"];

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
      { title: "문의", body: "제휴/후원", link: "/contact" },
    ],
    max: 12,
  },
  "footer.links": {
    label: "푸터 맨 아래 링크",
    description: "푸터 맨 아래 줄 오른쪽 링크입니다 ('관리자' 버튼은 항상 맨 끝에 있습니다). 하나도 없으면 링크 없이 보입니다.",
    columns: {
      title: { label: "이름", max: 20, required: true },
      link: {
        label: "주소",
        max: 300,
        required: true,
        hint: "사이트 안 페이지는 /로 시작 (예: /privacy), 바깥 사이트는 https:// 로 시작 — 바깥 사이트는 새 창",
      },
    },
    defaults: [{ title: "개인정보처리방침", link: "/privacy" }],
    max: 6,
  },

  // ── 구단소개 (관리자 개편 2단계) — 기본값은 그동안 data/club.ts 에 박혀 있던 값 그대로 ──
  "club.organization": {
    label: "팀 조직",
    description: "구단소개 '팀 조직' 카드입니다. 카드마다 이름과 항목(한 줄에 하나)을 적습니다. 하나도 없으면 그 섹션이 보이지 않습니다.",
    columns: CARD_COLUMNS,
    defaults: [
      { title: "남자 성인", body: "1군 서울은평 덴포스 (FK리그)\n2군 풋살사관학교 (생활체육)" },
      { title: "여자 성인", body: "1군 서울은평 위민 (FK리그 참가 목표)\n2군 풋살사관학교 레이디스 (생활체육)" },
      { title: "유소년", body: "U-18 (고등부)\nU-15 (중등부)\nU-12 (초등부)\nU-6 (유치부)" },
    ],
    max: 8,
  },
  "club.community": {
    label: "지역 활동",
    description: "구단소개 맨 아래 '지역 활동' 카드입니다. 카드마다 이름과 항목(한 줄에 하나)을 적습니다. 하나도 없으면 그 섹션이 보이지 않습니다.",
    columns: CARD_COLUMNS,
    defaults: [
      { title: "지역 연계 프로그램", body: "다문화 청년네트워크 풋살 교육\n이미자 통합센터 풋살 교육\n그루터기 지역아동센터 풋살 교육" },
      { title: "대회 유치", body: "은평구청장배 풋살 대회\n서울특별시 은평구 i LEAGUE" },
      { title: "전국 풋살 순회교육", body: "국민체육진흥공단 파견 스포츠스타 풋살 교육" },
    ],
    max: 8,
  },

  // ── 엠블럼/유니폼 (관리자 개편 2단계) ──
  "emblem.colors": {
    label: "팀 색상 (Main Color)",
    description: "엠블럼 탭 'Main Color' 색 칸입니다. RGB 숫자와 칸 위 글씨색(흰색/검은색)은 색 코드로 자동 계산됩니다. 하나도 없으면 'Main Color'가 보이지 않습니다.",
    columns: {
      title: { label: "색 이름", max: 20, required: true, hint: "예: 로열블루" },
      body: { label: "색 코드", max: 7, required: true, format: "hex", hint: "# 뒤에 여섯 자리 (예: #2B4FA2)" },
    },
    // 지금 사이트 엠블럼 파일(public/brand/emblem.png) 픽셀 색 — 구단 공식 색상 코드가 따로 있으면 그 값으로 바꾼다
    defaults: [
      { title: "로열블루", body: "#2B4FA2" },
      { title: "골드", body: "#E3A33A" },
      { title: "블랙", body: "#1A1715" },
      { title: "화이트", body: "#FFFFFF" },
    ],
    max: 8,
  },
  "kit.images": {
    label: "유니폼 사진",
    description: "유니폼 탭 사진입니다 (예: 홈/어웨이). 하나도 없으면 사진 칸이 보이지 않습니다.",
    columns: {
      image: { label: "사진", required: true, hint: "세로 사진 권장 (4:5 칸에 맞춰 잘립니다), JPG/PNG/WEBP 4MB 이하" },
      title: { label: "사진 아래 이름", max: 20, required: true, hint: "예: 홈" },
      body: { label: "사진 설명", max: 100, hint: "화면에는 안 보이고 화면 읽기 프로그램/검색엔진이 읽습니다 (예: 2026-27 홈 유니폼 (로열블루))" },
    },
    // 구단 공개(2026-10-06 '26-27 서울은평덴포스 HOME & AWAY KIT 공개', 인스타그램) 이미지에서 홈·어웨이 상의 한 장씩
    defaults: [
      { image: "/photos/kit-2627-home.webp", title: "홈", body: "2026-27 홈 유니폼 (로열블루)" },
      { image: "/photos/kit-2627-away.webp", title: "어웨이", body: "2026-27 어웨이 유니폼 (화이트/블루 스트라이프)" },
    ],
    max: 6,
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
