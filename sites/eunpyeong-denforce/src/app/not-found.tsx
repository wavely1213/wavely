import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { TopBar } from "@/components/layout/TopBar";
import { snsLinks } from "@/lib/club";
import { headerContent } from "@/lib/content/views";
import { getClubSettings, getSiteContent } from "@/lib/repo";
import styles from "@/styles/prose.module.css";

// 루트 not-found 는 (site) 레이아웃 밖이라 상단 띠·헤더·푸터를 직접 붙인다
export default async function NotFound() {
  const [settings, content] = await Promise.all([getClubSettings(), getSiteContent()]);
  const sns = snsLinks(settings);
  return (
    <>
      <TopBar sns={sns} store={{ label: content["nav.external.label"], href: content["nav.external.href"] }} />
      <Header pathname="" sns={sns} content={headerContent(content)} />
      <main>
        <div className={`container ${styles.center}`}>
          <h1>페이지를 찾을 수 없습니다</h1>
          <p>주소가 바뀌었거나 아직 준비 중인 페이지입니다.</p>
          <Link href="/" className={styles.button}>
            메인으로
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
