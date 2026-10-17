import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { NotFoundBody } from "@/components/layout/NotFoundBody";
import { TopBar } from "@/components/layout/TopBar";
import { snsLinks } from "@/lib/club";
import { headerContent } from "@/lib/content/views";
import { getClubSettings, getSiteContent } from "@/lib/repo";

// 루트 not-found 는 어느 주소와도 맞지 않는 주소(예: /nope)에 쓰이고 (site) 레이아웃 밖이라 상단 띠·헤더·푸터를 직접 붙인다.
// 사이트 페이지 안의 notFound() 는 (site)/not-found.tsx (본문만)
export default async function NotFound() {
  const [settings, content] = await Promise.all([getClubSettings(), getSiteContent()]);
  const sns = snsLinks(settings);
  return (
    <>
      <TopBar sns={sns} store={{ label: content["nav.external.label"], href: content["nav.external.href"] }} />
      <Header pathname="" sns={sns} content={headerContent(content)} />
      <main>
        <NotFoundBody />
      </main>
      <Footer />
    </>
  );
}
