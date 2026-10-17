import type { ClubSettings } from "@/types";

export type SnsName = "Instagram" | "YouTube";
export type SnsLink = { label: SnsName; href: string };

/** 값이 있는 SNS 링크만 (관리자 › 구단정보의 인스타그램·유튜브 주소) */
export function snsLinks(settings: ClubSettings): SnsLink[] {
  const all: Array<{ label: SnsName; href: string | null }> = [
    { label: "Instagram", href: settings.instagramUrl },
    { label: "YouTube", href: settings.youtubeUrl },
  ];
  return all.filter((s): s is SnsLink => Boolean(s.href));
}
