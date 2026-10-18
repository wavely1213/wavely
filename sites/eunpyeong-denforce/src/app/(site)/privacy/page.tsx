import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { DocumentBody } from "@/components/ui/DocumentBody";
import { Placeholder } from "@/components/ui/Placeholder";
import { PRIVACY_PLACEHOLDER } from "@/lib/content/fields";
import { getSiteContent } from "@/lib/repo";
import { pageMetadata } from "@/lib/page-meta";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("개인정보처리방침", "/privacy");
}

/** 본문은 관리자 › 홈페이지 내용 › 개인정보처리방침 (관리자 개편 4단계). 처음 값 그대로면 '준비 중' 상자 */
export default async function PrivacyPage() {
  const body = (await getSiteContent())["privacy.body"];
  return (
    <>
      <PageHeader title="개인정보처리방침" current="/privacy" />
      <div className="container">{body === PRIVACY_PLACEHOLDER ? <Placeholder label={body} /> : <DocumentBody text={body} />}</div>
    </>
  );
}
