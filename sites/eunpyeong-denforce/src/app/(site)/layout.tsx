import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SiteRootMarker } from "@/components/layout/SiteRootMarker";
import { SkipLink } from "@/components/layout/SkipLink";
import { HeaderWithPath } from "@/components/layout/HeaderWithPath";
import { snsLinks } from "@/lib/club";
import { headerContent } from "@/lib/content/views";
import { getClubSettings, getSiteContent } from "@/lib/repo";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, content] = await Promise.all([getClubSettings(), getSiteContent()]);
  // 공식 SNS — 상단 띠(PC)와 모바일 메뉴에 같은 목록 (D-042)
  const sns = snsLinks(settings);
  const header = headerContent(content);
  // site-root: 공개 화면 공통 초점 표시(globals.css)의 범위 — 관리자 화면은 그대로 둔다. display: contents 라 배치에는 영향 없음
  return (
    <div className="site-root">
      <SiteRootMarker />
      <SkipLink />
      {/* 경로를 빌드 때 모르는 페이지에서도 헤더가 prerender 되도록 Suspense 로 감싼다 */}
      <Suspense fallback={<Header pathname="" sns={sns} content={header} />}>
        <HeaderWithPath sns={sns} content={header} />
      </Suspense>
      {/* '본문 바로가기'(SkipLink)가 오는 곳 — tabIndex -1 이라 링크로 초점을 받을 수 있다 */}
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
