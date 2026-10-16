import type { Metadata } from "next";
import { ADMIN_PREVIEW_TEXT, SITE } from "@/config/site";
import { previewImage, previewMeta } from "@/lib/og";
import { getClubSettings } from "@/lib/repo";

/**
 * 관리자 화면 공통 메타. /admin 주소를 카카오톡 등에 보냈을 때는 사이트와 다른 관리자용 미리보기 (D-037·D-038):
 * 관리자 화면(구단정보 › 링크 미리보기)에서 정한 이미지·제목·설명, 없으면 public/og/admin.jpg·ADMIN_PREVIEW_TEXT.
 */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getClubSettings();
  return {
    title: { default: "관리자", template: `%s | ${ADMIN_PREVIEW_TEXT.title}` },
    description: ADMIN_PREVIEW_TEXT.description,
    robots: { index: false, follow: false },
    ...previewMeta({
      siteName: SITE.name,
      image: previewImage("admin", s.adminOgImageUrl, SITE.name),
      title: s.adminOgTitle || ADMIN_PREVIEW_TEXT.title,
      description: s.adminOgDescription || ADMIN_PREVIEW_TEXT.description,
    }),
  };
}

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
