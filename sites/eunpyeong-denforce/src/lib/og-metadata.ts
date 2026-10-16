// 사이트 페이지의 링크 미리보기 메타 (D-037·D-038) — 관리자 설정(getClubSettings, 캐시 태그 club)을 읽어 lib/og 로 만든다.
import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { previewImage, previewMeta, type PreviewMetaInput } from "@/lib/og";
import { getClubSettings } from "@/lib/repo";

type SitePreviewInput = Omit<PreviewMetaInput, "siteName" | "image"> & {
  /** 이 페이지만의 사진(글·선수 사진). 없으면 관리자가 올린 사이트 이미지 → 기본 이미지 */
  imageUrl?: string | null;
  imageAlt?: string;
};

export async function sitePreviewMeta(o: SitePreviewInput = {}): Promise<Pick<Metadata, "openGraph" | "twitter">> {
  const { imageUrl, imageAlt, ...text } = o;
  const image = imageUrl
    ? { url: imageUrl, alt: imageAlt ?? SITE.name }
    : previewImage("site", (await getClubSettings()).ogImageUrl, SITE.name);
  return previewMeta({ ...text, siteName: SITE.name, image });
}
