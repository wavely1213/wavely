// 대시보드 '페이지별 고치는 곳' — 홈페이지 각 페이지의 내용을 관리자 어디에서 고치는지 (D-048, 총괄 지도)
// edit 이 없으면 아직 관리자에서 못 고치는 페이지 (later: 개편 몇 단계에서 추가되는지)
import { PRIVACY_PAGE_ENABLED } from "./site";

export type AdminPageMap = { label: string; view: string; edit?: { href: string; label: string }; later?: string };

export const ADMIN_PAGE_MAP: readonly AdminPageMap[] = [
  { label: "메인", view: "/", edit: { href: "/admin/content/home", label: "홈페이지 내용 › 메인" } },
  { label: "헤더/푸터 (모든 페이지)", view: "/", edit: { href: "/admin/content/common", label: "홈페이지 내용 › 공통" } },
  { label: "구단소개", view: "/club", edit: { href: "/admin/content/club", label: "홈페이지 내용 › 구단소개 (소개 글은 구단정보)" } },
  { label: "연혁", view: "/club/history", edit: { href: "/admin/club", label: "구단정보 › 연혁" } },
  { label: "엠블럼/유니폼", view: "/club/emblem", edit: { href: "/admin/content/emblem", label: "홈페이지 내용 › 엠블럼/유니폼" } },
  { label: "오시는 길", view: "/club/location", edit: { href: "/admin/club", label: "구단정보 (주소/대중교통/주차)" } },
  { label: "선수단", view: "/team/players", edit: { href: "/admin/players", label: "선수" } },
  { label: "코칭스태프", view: "/team/staff", edit: { href: "/admin/staff", label: "코칭스태프 (섹션 제목은 홈페이지 내용 › 선수단)" } },
  { label: "경기일정/결과", view: "/match/schedule", edit: { href: "/admin/matches", label: "경기 (경기가 없을 때 안내는 홈페이지 내용 › 경기)" } },
  { label: "리그순위", view: "/match/standings", edit: { href: "/admin/standings", label: "리그순위 (표 아래 글은 홈페이지 내용 › 경기)" } },
  { label: "구단소식", view: "/news", edit: { href: "/admin/news", label: "구단소식 (글이 없을 때 안내는 홈페이지 내용 › 소식)" } },
  { label: "포스팅", view: "/news/posting", edit: { href: "/admin/postings", label: "포스팅 (글이 없을 때 안내는 홈페이지 내용 › 소식)" } },
  { label: "스폰서", view: "/sponsors", edit: { href: "/admin/sponsors", label: "스폰서 (스폰서십 문의 상자는 홈페이지 내용 › 스폰서)" } },
  { label: "문의", view: "/contact", edit: { href: "/admin/content/contact", label: "홈페이지 내용 › 문의 (연락처는 구단정보)" } },
  // 개인정보처리방침은 페이지를 켤 때만 (D-055)
  ...(PRIVACY_PAGE_ENABLED
    ? [{ label: "개인정보처리방침", view: "/privacy", edit: { href: "/admin/content/privacy", label: "홈페이지 내용 › 개인정보처리방침" } }]
    : []),
];
