import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { StaffGrid } from "@/components/player/StaffCard";
import { pageMetadata } from "@/lib/page-meta";
import { getSiteContent, getStaff } from "@/lib/repo";
import { splitStaff } from "@/lib/staff";
import { Placeholder } from "@/components/ui/Placeholder";
import local from "./staff.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("코칭스태프", "/team/staff");
}

// 코칭스태프(감독·코치)는 사진 카드, 프런트(단장·사무국 등)는 직책·이름 목록
export default async function StaffPage() {
  const [staff, content] = await Promise.all([getStaff(), getSiteContent()]);
  const { coaching, front } = splitStaff(staff);
  return (
    <>
      <PageHeader title="코칭스태프" current="/team/staff" />
      <div className={`container ${local.body}`}>
        {/* 아무도 없으면 안내 (디자인 UX 상태 표 208:22070, 고정 글 — 관리자 칸은 후보 KNOWN_ISSUES) */}
        {coaching.length === 0 && front.length === 0 && <Placeholder label="등록된 코칭스태프가 없습니다." />}
        {coaching.length > 0 && (
          <section>
            <h2 className={local.h2}>{content["staff.section.coaching"]}</h2>
            <StaffGrid staff={coaching} />
          </section>
        )}
        {front.length > 0 && (
          <section>
            <h2 className={local.h2}>{content["staff.section.front"]}</h2>
            {/* 프런트 — 3열 격자(휴대폰 1열), 직책 kfa/caption text-sub + 이름 Bold (리디자인 3차 155:18888) */}
            <dl className={local.front}>
              {front.map((s) => (
                <div key={s.id} className={local.frontItem}>
                  <dt>{s.role}</dt>
                  <dd>{s.name}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </>
  );
}
