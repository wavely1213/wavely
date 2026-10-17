import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { Placeholder } from "@/components/ui/Placeholder";

export const metadata: Metadata = { title: "개인정보처리방침" };

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="개인정보처리방침" current="/privacy" />
      <div className="container">
        <Placeholder label="개인정보처리방침은 회원/문의 기능 도입 시 작성합니다." />
      </div>
    </>
  );
}
