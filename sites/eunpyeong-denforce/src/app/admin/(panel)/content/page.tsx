import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { CONTENT_SECTIONS } from "@/lib/content/sections";
import local from "./content.module.css";
import { SectionTabs } from "./SectionTabs";

export const metadata: Metadata = { title: "홈페이지 내용" };

/** 다른 관리 메뉴가 맡는 내용 — 무엇을 어디서 고치는지 한눈에 (총괄 지도) */
const OTHER_MENUS = [
  { href: "/admin/news", label: "구단소식", desc: "공지사항·구단뉴스·사진·영상 글, 메인 소식 배너" },
  { href: "/admin/postings", label: "포스팅", desc: "블로그·기사·팬 포스팅·FK리그 영상 모음" },
  { href: "/admin/matches", label: "경기", desc: "경기 일정·결과, 메인 다음 홈경기·경기 카드" },
  { href: "/admin/standings", label: "리그순위", desc: "리그 순위표 (메인 순위 칸 포함)" },
  { href: "/admin/players", label: "선수", desc: "선수 명단·사진·기록" },
  { href: "/admin/staff", label: "코칭스태프", desc: "코칭스태프·프런트, 푸터 '단장'" },
  { href: "/admin/sponsors", label: "스폰서", desc: "스폰서 로고·주소 (메인 스폰서 띠 포함)" },
  { href: "/admin/club", label: "구단정보", desc: "구단소개 글·연락처·SNS·오시는 길·링크 미리보기·연혁·배출 국가대표" },
];

export default function ContentHubPage() {
  return (
    <>
      <PageTitle
        title="홈페이지 내용"
        description="화면 곳곳의 문구·사진·카드를 고칩니다. 칸을 비우고 저장하면 처음 값으로 돌아가고, 저장하면 홈페이지에 바로 반영됩니다."
      />
      <SectionTabs current="" />

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>구역</h2>
        <div className={local.cards}>
          {CONTENT_SECTIONS.map((s) => (
            <Link key={s.id} href={`/admin/content/${s.id}`} className={local.card}>
              <strong>{s.label}</strong>
              <span>{s.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>다른 메뉴에서 고치는 내용</h2>
        <div className={local.cards}>
          {OTHER_MENUS.map((m) => (
            <Link key={m.href} href={m.href} className={local.card}>
              <strong>{m.label}</strong>
              <span>{m.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
