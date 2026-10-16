// 스폰서 (DB 없이 돌릴 때의 정적 자료). 순서는 소유자 지시 (D-029). 운영 로고는 Storage media/sponsors/ — 덴포스스포츠 로고는 미수령.
import type { Sponsor, SponsorTier } from "@/types";

export const SPONSOR_TIER_LABEL: Record<SponsorTier, string> = {
  naming: "네이밍 스폰서",
  official: "공식 스폰서",
  partner: "파트너",
};

export const SPONSORS: Sponsor[] = [
  { id: "sp1", name: "은평구", tier: "partner", logo: null, url: null },
  { id: "sp2", name: "은평구체육회", tier: "partner", logo: null, url: null },
  { id: "sp3", name: "은평풋살연맹", tier: "partner", logo: null, url: null },
  { id: "sp4", name: "덴포스스포츠", tier: "naming", logo: null, url: null },
  { id: "sp5", name: "풋살사관학교", tier: "partner", logo: null, url: null },
  { id: "sp6", name: "꽁병지TV", tier: "partner", logo: null, url: null },
];
