// 스폰서 (DB 없이 돌릴 때의 정적 자료). 운영 로고는 Storage media/sponsors/ — 덴포스스포츠 로고는 미수령.
import type { Sponsor, SponsorTier } from "@/types";

/** 등급 순서 — 높은 등급부터. /sponsors 페이지 등급별 묶음과 메인 스폰서 띠가 이 순서를 따른다 */
export const SPONSOR_TIER_ORDER: readonly SponsorTier[] = ["naming", "official", "sub", "partner"];

/** 등급 이름 — 키 순서는 SPONSOR_TIER_ORDER 와 같게 (관리자 등급 선택 목록이 이 순서로 나온다) */
export const SPONSOR_TIER_LABEL: Record<SponsorTier, string> = {
  naming: "네이밍 스폰서",
  official: "메인 스폰서",
  sub: "서브 스폰서",
  partner: "후원사",
};

// 같은 등급 안에서는 이 순서대로 (운영 DB sort_order 와 같은 순서). 등급은 2026-10-19 운영 DB 기준 — 소유자가 관리자에서 정리 중
export const SPONSORS: Sponsor[] = [
  { id: "sp1", name: "은평구", tier: "official", logo: null, url: null },
  { id: "sp2", name: "은평구체육회", tier: "official", logo: null, url: null },
  { id: "sp3", name: "은평풋살연맹", tier: "official", logo: null, url: null },
  { id: "sp4", name: "덴포스스포츠", tier: "naming", logo: null, url: null },
  { id: "sp5", name: "스매싱스포츠", tier: "partner", logo: null, url: null },
  { id: "sp6", name: "스카로", tier: "partner", logo: null, url: null },
  { id: "sp7", name: "엑스트라조스", tier: "partner", logo: null, url: null },
  { id: "sp8", name: "풋살사관학교", tier: "partner", logo: null, url: null },
  { id: "sp9", name: "꽁병지TV", tier: "partner", logo: null, url: null },
  { id: "sp10", name: "토탈스포츠컴퍼니", tier: "partner", logo: null, url: null },
];
