import type { Metadata } from "next";
import localFont from "next/font/local";
import { SEARCH_VERIFICATION, SITE, SITE_DESCRIPTION } from "@/config/site";
import { sitePreviewMeta } from "@/lib/og-metadata";
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

/**
 * 링크 미리보기(카카오톡·문자·SNS) 이미지: 관리자 화면(구단정보 › 링크 미리보기)에서 올린 이미지, 없으면
 * 기본 이미지 public/og/site.jpg (홈 히어로 구성, 1200×630) — D-025·D-037. 제목·설명은 페이지 제목·설명을 따른다
 * (홈은 관리자 문구 — (site)/page.tsx, 구단소식 글·선수는 그 사진 — D-038). /admin 은 admin/layout.tsx 가 따로 정한다.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(SITE.url),
    title: { default: SITE.name, template: `%s | ${SITE.name}` },
    description: SITE_DESCRIPTION,
    // 아이콘은 파일 규칙으로: app/favicon.ico·icon.png·apple-icon.png (구단 엠블럼, 정사각)
    ...(await sitePreviewMeta()),
    // 대표 주소(canonical) — './' 는 Next 가 지금 페이지 경로로 풀어 페이지마다 자기 주소가 된다(쿼리 제외) (D-039)
    alternates: { canonical: "./" },
    // 네이버 서치어드바이저 소유 확인 (D-027)
    ...(SEARCH_VERIFICATION.naver ? { verification: { other: { "naver-site-verification": SEARCH_VERIFICATION.naver } } } : {}),
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={kfa.variable}>
      {/* 사이트 헤더·푸터는 (site)/layout.tsx, 관리자 화면은 admin/layout.tsx */}
      <body>{children}</body>
    </html>
  );
}
