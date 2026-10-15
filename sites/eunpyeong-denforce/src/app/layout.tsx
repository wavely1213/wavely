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

export const metadata: Metadata = {
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.tagline,
  icons: { icon: SITE.emblemMark },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={kfa.variable}>
      {/* 사이트 헤더·푸터는 (site)/layout.tsx, 관리자 화면은 admin/layout.tsx */}
      <body>{children}</body>
    </html>
  );
}
