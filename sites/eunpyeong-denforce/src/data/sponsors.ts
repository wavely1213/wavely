// 스폰서. 로고 파일은 미수령 — 받으면 public/sponsors/ 에 넣고 logo 경로를 채운다.
import type { Sponsor, SponsorTier } from "@/types";

export const SPONSOR_TIER_LABEL: Record<SponsorTier, string> = {
  naming: "네이밍 스폰서",
  official: "공식 스폰서",
  partner: "파트너",
};

export const SPONSORS: Sponsor[] = [
  { name: "덴포스 (Denforce)", tier: "naming", logo: null, url: null },
  { name: "풋살사관학교", tier: "partner", logo: null, url: null },
];
