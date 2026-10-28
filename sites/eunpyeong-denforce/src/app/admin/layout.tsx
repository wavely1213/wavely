import type { Metadata } from "next";
import { adminPreviewText } from "@/config/site";
import { previewImage, previewMeta } from "@/lib/og";
import { getClubSettings, getSiteContent } from "@/lib/repo";

/**
 * 관리자 화면 공통 메타. /admin 주소를 카카오톡 등에 보냈을 때는 사이트와 다른 관리자용 미리보기 (D-037·D-038):
 * 관리자 화면(구단정보 › 링크 미리보기)에서 정한 이미지·제목·설명, 없으면 public/og/admin.jpg·adminPreviewText.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [s, c] = await Promise.all([getClubSettings(), getSiteContent()]);
  const siteName = c["site.name"];
  const text = adminPreviewText(siteName);
  return {
    title: { default: "관리자", template: `%s | ${text.title}` },
    description: text.description,
    robots: { index: false, follow: false },
    ...previewMeta({
      siteName,
      image: previewImage("admin", s.adminOgImageUrl, siteName),
      title: s.adminOgTitle || text.title,
      description: s.adminOgDescription || text.description,
    }),
  };
}

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
