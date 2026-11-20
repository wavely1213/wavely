import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { YouthGrid } from "@/components/player/YouthCard";
import { YOUTH_TEAMS } from "@/config/youth";
import { splitParagraphs } from "@/lib/data/rows";
import { pageMetadata } from "@/lib/page-meta";
import { getSiteContent } from "@/lib/repo";
import local from "./youth.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("유스", "/team/youth");
}

// 선수단 › 유스 — 유스 팀 카드(이름 + 엠블럼). 소개 글은 관리자에서 채우면 위에 보이고, 비어 있으면 숨긴다 (지어낸 글 없음)
export default async function YouthPage() {
  const content = await getSiteContent();
  const intro = splitParagraphs(content["youth.intro"]);
  return (
    <>
      <PageHeader title="유스" current="/team/youth" />
      <div className={`container ${local.body}`}>
        {intro.length > 0 && (
          <div className={local.intro}>
            {intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
        <YouthGrid teams={YOUTH_TEAMS} />
      </div>
    </>
  );
}
