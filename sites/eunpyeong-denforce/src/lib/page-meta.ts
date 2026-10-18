// 페이지 제목 + 그 페이지만의 검색 설명 — 구단 이름·홈구장은 관리자 › 기본 정보(getSiteContent)에서 읽는다
import type { Metadata } from "next";
import { LEAGUE } from "@/config/league";
import { type DescriptionInput, type DescriptionPath, pageDescription } from "@/lib/page-descriptions";
import { getSiteContent } from "@/lib/repo";

export async function descriptionInput(): Promise<DescriptionInput> {
  const c = await getSiteContent();
  return { club: c["site.name"], homeVenue: c["site.homeVenue"], competition: LEAGUE.currentCompetition };
}

export async function pageMetadata(title: string, path: DescriptionPath): Promise<Metadata> {
  return { title, description: pageDescription(path, await descriptionInput()) };
}
