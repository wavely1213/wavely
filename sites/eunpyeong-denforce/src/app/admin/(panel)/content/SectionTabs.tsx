import Link from "@/components/admin/AdminLink";
import { CONTENT_SECTIONS } from "@/lib/content/sections";
import local from "./content.module.css";

/** 홈페이지 내용 구역 탭 — current 는 지금 구역 id (첫 화면이면 빈 값) */
export function SectionTabs({ current }: { current: string }) {
  return (
    <nav className={local.tabs} aria-label="홈페이지 내용 구역">
      <Link href="/admin/content" className={`${local.tab} ${current === "" ? local.tabActive : ""}`} aria-current={current === "" ? "page" : undefined}>
        전체
      </Link>
      {CONTENT_SECTIONS.map((s) => (
        <Link
          key={s.id}
          href={`/admin/content/${s.id}`}
          className={`${local.tab} ${s.id === current ? local.tabActive : ""}`}
          aria-current={s.id === current ? "page" : undefined}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
