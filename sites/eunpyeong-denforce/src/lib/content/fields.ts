// 홈페이지 내용 — 한 칸짜리 값의 목록 (D-046). 관리자 › 홈페이지 내용에서 고치고, DB(site_content)에는 바꾼 값만 저장한다.
// 기본값은 그동안 코드에 박혀 있던 값 그대로 — 행이 없거나 칸을 비우면 기본값이 보인다.
// 키를 바꾸거나 지우면 저장돼 있던 값이 더는 쓰이지 않는다 (키는 바꾸지 말고 새로 만든다).
// 상대 경로·.ts 확장자 — npm test(node)가 별칭(@/) 없이 바로 읽게
import { NAV_EXTERNAL, SITE, SITE_DESCRIPTION } from "../../config/site.ts";

/**
 * text: 한 줄 · multiline: 여러 줄(문단은 빈 줄) · lines: 한 줄에 하나씩(목록) · date: YYYY-MM-DD
 * link: 사이트 안 주소(/로 시작) 또는 http(s):// · image: 사진(업로드, 값은 주소)
 */
export type FieldKind = "text" | "multiline" | "lines" | "date" | "link" | "image";

export type FieldDef = {
  label: string;
  kind: FieldKind;
  default: string;
  /** 글자 수 상한 (image·date 제외) */
  max?: number;
  /** 어디에 보이는지 등 관리자 안내 */
  hint?: string;
  /** 입력 화면 — markup: '**이름표** 값' 줄 편집기(여러 줄), markupLine: 한 줄 (D-048) */
  editor?: "markup" | "markupLine";
  /** 여러 줄 입력 칸 높이 (줄 수) — 긴 문서용 */
  rows?: number;
};

/** 개인정보처리방침 기본값 — 이 글 그대로면 페이지는 '준비 중' 상자로 보인다 (관리자 개편 4단계) */
export const PRIVACY_PLACEHOLDER = "개인정보처리방침은 회원/문의 기능 도입 시 작성합니다.";

/** 푸터 정보 줄 기본값 — 그동안 Footer.tsx 에 박혀 있던 배치 그대로 (D-044·D-047) */
export const FOOTER_LINES_DEFAULT = ["**창단** {창단연도} **홈구장** {홈구장}", "**사무국** {사무국주소}", "**단장** {단장} **문의** {문의메일} / {문의전화}"].join("\n");

export const CONTENT_FIELDS = {
  // ── 기본 정보 ──
  "site.name": {
    label: "구단 이름",
    kind: "text",
    max: 30,
    default: SITE.name,
    hint: "헤더/푸터/메인 큰 제목/브라우저 탭 제목/경기 일정표의 우리 팀 이름 등 사이트 전체",
  },
  "site.nameEn": {
    label: "영문 이름",
    kind: "text",
    max: 60,
    default: SITE.nameEn,
    hint: "헤더 로고 옆 작은 글씨, 검색엔진용 다른 이름",
  },
  "site.foundedDate": {
    label: "창단일",
    kind: "date",
    default: SITE.foundedDate,
    hint: "푸터 '창단'에는 연도만 보입니다. 검색엔진용 구단 정보에도 쓰입니다",
  },
  "site.representative": { label: "대표", kind: "text", max: 20, default: SITE.representative, hint: "푸터 오른쪽 아래 '대표'" },
  "site.homeVenue": {
    label: "홈구장 이름",
    kind: "text",
    max: 40,
    default: SITE.homeVenue,
    hint: "푸터 '홈구장', 오시는 길 제목, 경기 추가 화면의 기본 장소. 주소는 관리자 › 구단정보",
  },
  "site.description": {
    label: "사이트 설명",
    kind: "text",
    max: 160,
    default: SITE_DESCRIPTION,
    hint: "검색 결과에 보이는 설명. 링크 미리보기 설명을 따로 정하지 않았으면 미리보기에도 쓰입니다",
  },
  "site.alternateNames": {
    label: "구단의 다른 이름 (검색엔진용)",
    kind: "lines",
    max: 500,
    default: SITE.alternateNames.join("\n"),
    hint: "한 줄에 하나 — 예전 팀 이름/띄어쓰기가 다른 이름. 화면에는 보이지 않고 검색엔진에 알려 줍니다",
  },
  "nav.external.label": {
    label: "상단 스토어 버튼 이름",
    kind: "text",
    max: 20,
    default: NAV_EXTERNAL.label,
    hint: "맨 위 띠 오른쪽(모바일은 메뉴 안) 쇼핑백 아이콘 버튼 — 새 창으로 열립니다 (사이트맵 페이지에도)",
  },
  "nav.external.href": {
    label: "상단 스토어 버튼 주소",
    kind: "link",
    max: 300,
    default: NAV_EXTERNAL.href,
    hint: "https:// 로 시작하는 주소",
  },

  // ── 푸터 (D-048) — {값 이름}은 화면에서 실제 값으로 바뀐다 (src/lib/content/markup.ts) ──
  "footer.lines": {
    label: "푸터 정보 줄",
    kind: "lines",
    editor: "markup",
    max: 2000,
    default: FOOTER_LINES_DEFAULT,
    hint: "푸터 구단 이름 아래 줄들. 값이 비어 있는 칸(예: 사무국 주소 없음)은 자동으로 숨겨집니다",
  },
  "footer.legal": {
    label: "맨 아래 오른쪽 정보",
    kind: "text",
    editor: "markupLine",
    max: 200,
    default: "**대표** {대표}",
    hint: "맨 아래 줄 오른쪽, 아래 '맨 아래 링크' 앞",
  },
  "footer.copyright": {
    label: "저작권 문구",
    kind: "text",
    max: 100,
    default: "© {구단이름}. All rights reserved.",
    hint: "맨 아래 줄 왼쪽. {구단이름}은 구단 이름으로 바뀝니다",
  },

  // ── 메인 ──
  "home.hero.image": {
    label: "메인 사진",
    kind: "image",
    default: "/photos/hero-dreamleague-2019.webp",
    hint: "맨 위 큰 사진 — 가로로 긴 사진(1920×1080 이상 권장), JPG/PNG/WEBP 4MB 이하. 글씨가 왼쪽 아래에 얹힙니다",
  },
  "home.hero.imageAlt": {
    label: "메인 사진 설명",
    kind: "text",
    max: 100,
    default: "서울은평 선수단 단체 사진",
    hint: "화면에는 안 보이고 화면 읽기 프로그램/검색엔진이 읽습니다",
  },
  "home.hero.eyebrow": { label: "큰 제목 위 작은 글씨", kind: "text", max: 60, default: `SINCE ${SITE.founded} / FK LEAGUE` },
  "home.hero.slogan": {
    label: "슬로건",
    kind: "text",
    max: 40,
    default: "대한민국 풋살의 중심",
    hint: "구단 이름 바로 위 한 줄 — 글자 크기는 아래 구단 이름 폭에 딱 맞게 자동으로 정해집니다",
  },
  "home.section.matches": { label: "경기 섹션 제목", kind: "text", max: 20, default: "경기" },
  "home.section.news": { label: "구단 소식 섹션 제목", kind: "text", max: 20, default: "구단 소식" },
  "home.section.standings": { label: "리그 순위 칸 제목", kind: "text", max: 20, default: "리그 순위" },
  "home.section.players": { label: "선수단 섹션 제목", kind: "text", max: 20, default: "선수단" },
  "home.section.quicklinks": { label: "바로가기 섹션 제목", kind: "text", max: 20, default: "바로가기" },

  // ── 구단소개 (관리자 개편 2단계) — 기본값은 그동안 club/page.tsx 에 박혀 있던 값 그대로 ──
  "club.photo": {
    label: "구단소개 사진",
    kind: "image",
    default: "/photos/superleague-2021-runnerup.webp",
    hint: "소개 글 오른쪽(휴대폰은 글 아래) 사진 — 가로 사진 권장 (4:3 칸에 맞춰 잘립니다), JPG/PNG/WEBP 4MB 이하",
  },
  "club.photoAlt": {
    label: "구단소개 사진 설명",
    kind: "text",
    max: 100,
    default: "2020-21 슈퍼리그 준우승 기념 사진",
    hint: "화면에는 안 보이고 화면 읽기 프로그램/검색엔진이 읽습니다",
  },
  "club.section.organization": { label: "팀 조직 섹션 제목", kind: "text", max: 20, default: "팀 조직" },
  "club.section.alumni": { label: "배출 국가대표 섹션 제목", kind: "text", max: 20, default: "배출 풋살 국가대표" },
  "club.section.community": { label: "지역 활동 섹션 제목", kind: "text", max: 20, default: "지역 활동" },

  // ── 엠블럼/유니폼 (관리자 개편 2단계) — 사실만: 엠블럼에 실제로 들어 있는 요소·창단 연도·색 (D-045) ──
  "emblem.text": {
    label: "엠블럼 설명",
    kind: "multiline",
    max: 2000,
    default: [
      "서울은평 덴포스의 엠블럼은 **페넌트 형태** 안에 **'SEOUL EUNPYEONG FUTSAL TEAM'** 문구와 은평(Eunpyeong)의 머리글자 **'E'**, 그리고 **풋살공**을 담았습니다.",
      "하단의 **'SINCE 2012'**는 구단이 창단한 해를 뜻하며, 엠블럼은 **로열블루/골드/블랙/화이트** 네 가지 색으로 이루어져 있습니다.",
    ].join("\n\n"),
    hint: "엠블럼 탭 아래 설명. 문단은 빈 줄로 나누고, **별표 두 개로 감싼 글**은 굵게 보입니다",
  },
  // ── 개인정보처리방침 (관리자 개편 4단계) — 글 규칙: '## 소제목', '- 목록', 빈 줄 = 문단 (lib/content/document.ts) ──
  "privacy.body": {
    label: "개인정보처리방침 본문",
    kind: "multiline",
    max: 20000,
    rows: 24,
    default: PRIVACY_PLACEHOLDER,
    hint: "'## 1. 제목'처럼 ## 로 시작하는 줄은 소제목, '- '로 시작하는 줄은 목록, 빈 줄은 문단 나눔입니다. 칸을 비우고 저장하면 다시 '준비 중'으로 보입니다",
  },

  "kit.season": {
    label: "유니폼 시즌",
    kind: "text",
    max: 20,
    default: "2026-27",
    hint: "유니폼 탭 제목 '○○ 시즌 유니폼'의 앞부분 (예: 2026-27)",
  },
} as const satisfies Record<string, FieldDef>;

export type ContentKey = keyof typeof CONTENT_FIELDS;

/** 화면에 쓰는 값 — 모든 키에 값이 있다 (바꾼 값 또는 기본값) */
export type SiteContent = Record<ContentKey, string>;

export function isContentKey(key: string): key is ContentKey {
  return Object.hasOwn(CONTENT_FIELDS, key);
}

export function fieldDef(key: ContentKey): FieldDef {
  return CONTENT_FIELDS[key];
}
