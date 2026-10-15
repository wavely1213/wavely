import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import { formatKickoff } from "@/lib/format";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import type { NewsCategory } from "@/types";

export const metadata: Metadata = { title: "대시보드" };

export default function DashboardPage() {
  return (
    <>
      <PageTitle title="대시보드" description="저장한 내용은 홈페이지에 바로 반영됩니다 (늦어도 1분 이내)." />
      <Suspense fallback={<AdminLoading />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const { supabase } = await requireAdminPage();
  const count = async (table: string) => {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
    return count ?? 0;
  };

  const [news, matches, players, sponsors, upcoming, recent] = await Promise.all([
    count("news_posts"),
    count("matches"),
    count("players"),
    count("sponsors"),
    supabase
      .from("matches")
      .select("id, kickoff, opponent, is_home, round")
      .eq("status", "scheduled")
      .order("kickoff")
      .limit(3),
    supabase
      .from("news_posts")
      .select("id, title, category, date, published")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    { href: "/admin/news", label: "구단소식", value: news },
    { href: "/admin/matches", label: "경기", value: matches },
    { href: "/admin/players", label: "선수", value: players },
    { href: "/admin/sponsors", label: "스폰서", value: sponsors },
  ];

  return (
    <>
      <div className={styles.stats}>
        {stats.map((s) => (
          <Link key={s.href} href={s.href} className={styles.stat}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </Link>
        ))}
      </div>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>다가오는 경기</h2>
        {upcoming.data && upcoming.data.length > 0 ? (
          <ul>
            {upcoming.data.map((m) => {
              const { date, time } = formatKickoff(m.kickoff);
              return (
                <li key={m.id} style={{ padding: "6px 0" }}>
                  <Link href={`/admin/matches/${m.id}`}>
                    {date} {time}
                    {m.round && ` · ${m.round}`} · {m.is_home ? "홈" : "원정"} vs {m.opponent}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.hint}>예정된 경기가 없습니다.</p>
        )}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>최근 소식</h2>
        {recent.data && recent.data.length > 0 ? (
          <ul>
            {recent.data.map((n) => (
              <li key={n.id} style={{ padding: "6px 0" }}>
                <Link href={`/admin/news/${n.id}`}>
                  [{NEWS_CATEGORY_LABEL[n.category as NewsCategory]}] {n.title}
                  {!n.published && " (비공개)"}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.hint}>등록된 소식이 없습니다.</p>
        )}
      </section>
    </>
  );
}
