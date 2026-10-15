import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HeaderWithPath } from "@/components/layout/HeaderWithPath";
import { SITE } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.tagline,
  icons: { icon: SITE.emblem },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        {/* 경로를 빌드 때 모르는 페이지(404 등)에서도 헤더가 prerender 되도록 Suspense 로 감싼다 */}
        <Suspense fallback={<Header pathname="" />}>
          <HeaderWithPath />
        </Suspense>
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
