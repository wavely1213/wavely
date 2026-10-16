import type { Metadata } from "next";
import { SITE } from "@/config/site";
import { previewImage } from "@/lib/og";
import { getClubSettings } from "@/lib/repo";

const ADMIN_TITLE = `${SITE.name} 관리자`;
const ADMIN_DESCRIPTION = `${SITE.name} 홈페이지 관리자 — 구단소식·경기·선수단·스폰서 관리`;

/**
 * 관리자 화면 공통 메타. /admin 주소를 카카오톡 등에 보냈을 때는 사이트와 다른 관리자용 미리보기 (D-037):
 * 관리자 화면(구단정보 › 링크 미리보기)에서 올린 이미지, 없으면 public/og/admin.jpg.
 * openGraph 는 상위(루트) 값을 통째로 덮으므로 사이트 공통 항목도 다시 적는다.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { adminOgImageUrl } = await getClubSettings();
  const image = previewImage("admin", adminOgImageUrl, SITE.name);
  return {
    title: { default: "관리자", template: `%s | ${ADMIN_TITLE}` },
    description: ADMIN_DESCRIPTION,
    robots: { index: false, follow: false },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: "ko_KR",
      title: ADMIN_TITLE,
      description: ADMIN_DESCRIPTION,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: ADMIN_TITLE, description: ADMIN_DESCRIPTION, images: [image] },
  };
}

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
