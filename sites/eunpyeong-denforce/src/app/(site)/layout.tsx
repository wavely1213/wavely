import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HeaderWithPath } from "@/components/layout/HeaderWithPath";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* 경로를 빌드 때 모르는 페이지에서도 헤더가 prerender 되도록 Suspense 로 감싼다 */}
      <Suspense fallback={<Header pathname="" />}>
        <HeaderWithPath />
      </Suspense>
      <main>{children}</main>
      <Footer />
    </>
  );
}
