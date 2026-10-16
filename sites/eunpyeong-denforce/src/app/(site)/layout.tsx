import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HeaderWithPath } from "@/components/layout/HeaderWithPath";
import { TopBar } from "@/components/layout/TopBar";
import { snsLinks } from "@/lib/club";
import { getClubSettings } from "@/lib/repo";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  // 공식 SNS — 상단 띠(PC)와 모바일 메뉴에 같은 목록 (D-042)
  const sns = snsLinks(await getClubSettings());
  return (
    <>
      <TopBar sns={sns} />
      {/* 경로를 빌드 때 모르는 페이지에서도 헤더가 prerender 되도록 Suspense 로 감싼다 */}
      <Suspense fallback={<Header pathname="" sns={sns} />}>
        <HeaderWithPath sns={sns} />
      </Suspense>
      <main>{children}</main>
      <Footer />
    </>
  );
}
