import type { Metadata } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { HeaderWithPath } from "@/components/layout/HeaderWithPath";
import { SITE } from "@/config/site";
import "./globals.css";

// KFA고딕 (대한축구협회 서체, 산돌 제작) — 사용 조건은 KNOWN_ISSUES I-007
const kfa = localFont({
  src: [
    { path: "../fonts/KFAGothic-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/KFAGothic-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-kfa",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.tagline,
  icons: { icon: SITE.emblem },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={kfa.variable}>
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
