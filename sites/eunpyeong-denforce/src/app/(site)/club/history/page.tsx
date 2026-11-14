import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { achievementItems } from "@/lib/achievements";
import { pageMetadata } from "@/lib/page-meta";
import { getHistory, getNationalTeamAlumni, getSiteContent } from "@/lib/repo";
import local from "./history.module.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("연혁", "/club/history");
}

/** 연혁 (리디자인 3차 152:18164) — 맨 위 성과 띠(데이터에서만, 없는 칸 숨김) + 연도 목록 */
export default async function HistoryPage() {
  const [history, alumni, content] = await Promise.all([getHistory(), getNationalTeamAlumni(), getSiteContent()]);
  const achievements = achievementItems({ foundedDate: content["site.foundedDate"], history, alumniCount: alumni.length });
  return (
    <>
      <PageHeader title="연혁" current="/club/history" />
      <div className={`container ${local.body}`}>
        {achievements.length > 0 && (
          <dl className={local.strip} data-surface="dark">
            {achievements.map((a) => (
              <div key={a.label} className={local.item}>
                <dt className={local.label}>{a.label}</dt>
                <dd className={local.value}>{a.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <ul className={local.list}>
          {history.map((h) => (
            <li key={h.id}>
              <span className={local.year}>{h.year}</span>
              <span className={local.event}>{h.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
