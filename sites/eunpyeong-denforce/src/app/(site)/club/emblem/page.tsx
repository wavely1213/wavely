import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ContentTabs } from "@/components/ui/ContentTabs";
import { kitLinks } from "@/lib/news";
import { getNews } from "@/lib/repo";
import { EmblemPanel } from "./EmblemPanel";
import { UniformPanel } from "./UniformPanel";
import { pageMetadata } from "@/lib/page-meta";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("엠블럼/유니폼", "/club/emblem");
}

/** 엠블럼·유니폼 — 페이지 안 탭 '엠블럼 | 유니폼' (강원FC 엠블럼 페이지 방식, D-045). /club/emblem#uniform 은 유니폼 탭으로 열린다 */
export default async function EmblemPage() {
  const { reveal } = kitLinks(await getNews());
  return (
    <>
      <PageHeader title="엠블럼/유니폼" current="/club/emblem" />
      <div className="container">
        <ContentTabs
          label="엠블럼/유니폼"
          tabs={[
            { id: "emblem", label: "엠블럼", panel: <EmblemPanel /> },
            { id: "uniform", label: "유니폼", panel: <UniformPanel reveal={reveal} /> },
          ]}
        />
      </div>
    </>
  );
}
