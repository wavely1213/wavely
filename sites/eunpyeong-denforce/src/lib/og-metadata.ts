// 사이트 페이지의 링크 미리보기 메타 (D-037·D-038) — 관리자 설정(getClubSettings, 캐시 태그 club)을 읽어 lib/og 로 만든다.
// 사이트 이름은 관리자 › 홈페이지 내용 › 기본 정보 '구단 이름' (D-046)
import type { Metadata } from "next";
import { previewImage, previewMeta, type PreviewMetaInput } from "@/lib/og";
import { getClubSettings, getSiteContent } from "@/lib/repo";

type SitePreviewInput = Omit<PreviewMetaInput, "siteName" | "image"> & {
  /** 이 페이지만의 사진(글·선수 사진). 없으면 관리자가 올린 사이트 이미지 → 기본 이미지 */
  imageUrl?: string | null;
  imageAlt?: string;
};

export async function sitePreviewMeta(o: SitePreviewInput = {}): Promise<Pick<Metadata, "openGraph" | "twitter">> {
  const { imageUrl, imageAlt, ...text } = o;
  const [settings, content] = await Promise.all([getClubSettings(), getSiteContent()]);
  const siteName = content["site.name"];
  const image = imageUrl ? { url: imageUrl, alt: imageAlt ?? siteName } : previewImage("site", settings.ogImageUrl, siteName);
  return previewMeta({ ...text, siteName, image });
}
