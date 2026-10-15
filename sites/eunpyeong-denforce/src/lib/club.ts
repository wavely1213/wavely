import type { ClubSettings } from "@/types";

/** 값이 있는 SNS 링크만 */
export function snsLinks(settings: ClubSettings) {
  return [
    { label: "Instagram", href: settings.instagramUrl },
    { label: "YouTube", href: settings.youtubeUrl },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));
}
