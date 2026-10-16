import type { Metadata } from "next";
import localFont from "next/font/local";
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

// 링크 미리보기(카카오톡·문자·SNS): 사진은 app/opengraph-image.jpg (홈 첫 화면과 같은 구성, 1200×630) — D-025
const DESCRIPTION = `${SITE.tagline} · 경기 일정·결과, 선수단, 구단 소식`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: DESCRIPTION,
  icons: { icon: SITE.emblemMark },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "ko_KR",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={kfa.variable}>
      {/* 사이트 헤더·푸터는 (site)/layout.tsx, 관리자 화면은 admin/layout.tsx */}
      <body>{children}</body>
    </html>
  );
}
