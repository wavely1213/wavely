import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocumentBody } from "@/components/ui/DocumentBody";
import { Placeholder } from "@/components/ui/Placeholder";
import { PRIVACY_PAGE_ENABLED } from "@/config/site";
import { PRIVACY_PLACEHOLDER } from "@/lib/content/fields";
import { pageMetadata } from "@/lib/page-meta";
import { getSiteContent } from "@/lib/repo";

export async function generateMetadata(): Promise<Metadata> {
  if (!PRIVACY_PAGE_ENABLED) notFound();
  return pageMetadata("개인정보처리방침", "/privacy");
}

/** 본문은 관리자 › 홈페이지 내용 › 개인정보처리방침 (관리자 개편 4단계). 처음 값 그대로면 '준비 중' 상자. 지금은 꺼 둠 (D-055) */
export default async function PrivacyPage() {
  if (!PRIVACY_PAGE_ENABLED) notFound();
  const body = (await getSiteContent())["privacy.body"];
  return (
    <>
      <PageHeader title="개인정보처리방침" current="/privacy" />
      <div className="container">{body === PRIVACY_PLACEHOLDER ? <Placeholder label={body} /> : <DocumentBody text={body} />}</div>
    </>
  );
}
