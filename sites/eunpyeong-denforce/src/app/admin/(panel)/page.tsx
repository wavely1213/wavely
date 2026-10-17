import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { ADMIN_PAGE_MAP } from "@/config/admin-pages";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { POSTING_PLATFORM_LABEL } from "@/data/postings";
import { numberAlerts, rosterAlerts, siteGapAlerts, sortAlerts, type AdminAlert, type AlertLevel } from "@/lib/admin/alerts";
import { requireAdminPage } from "@/lib/admin/auth";
import { formatKickoff, formatPostDate } from "@/lib/format";
import type { NewsCategory, PostingPlatform } from "@/types";
import local from "./dashboard.module.css";

export const metadata: Metadata = { title: "대시보드" };

/** 자주 쓰는 작업 — 첫 화면 맨 위 */
const QUICK_ACTIONS = [
  { href: "/admin/news/new", label: "+ 소식 쓰기" },
  { href: "/admin/matches/new", label: "+ 경기 추가" },
  { href: "/admin/players/new", label: "+ 선수 추가" },
  { href: "/admin/postings/new", label: "+ 포스팅 추가" },
];

const LEVEL_LABEL: Record<AlertLevel, string> = { warn: "꼭 확인", check: "확인", info: "참고" };

export default function DashboardPage() {
  return (
    <>
      <PageTitle title="대시보드" description="할 일과 최근 내용을 한눈에 봅니다. 저장한 내용은 홈페이지에 바로 반영됩니다 (늦어도 1분 이내).">
        <Link href="/" target="_blank" className={styles.buttonGhost}>
          홈페이지 보기 ↗
        </Link>
      </PageTitle>
      <nav className={local.quick} aria-label="빠른 작업">
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className={styles.button}>
            {a.label}
          </Link>
        ))}
        <Link href="/admin/content" className={styles.buttonGhost}>
          홈페이지 내용 고치기
        </Link>
      </nav>
      <Suspense fallback={<AdminLoading />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

/** 오늘 날짜 (한국 시간, YYYY-MM-DD) */
function kstToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

async function Dashboard() {
  const { supabase } = await requireAdminPage();
  const now = new Date();
  const count = async (table: string, filter?: { column: string; value: boolean }) => {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) q = q.eq(filter.column, filter.value);
    const { count } = await q;
    return count ?? 0;
  };

  const [players, staff, news, settings, upcoming, recentNews, recentPostings, newsTotal, postingsShown, sponsors, matches] = await Promise.all([
    supabase.from("players").select("id, name, number, is_active, photo_url"),
    supabase.from("staff").select("id, name, role"),
    supabase.from("news_posts").select("title, date, category, published"),
    supabase.from("club_settings").select("venue_transit, venue_parking, contact_email, contact_phone").eq("id", 1).maybeSingle(),
    supabase
      .from("matches")
      .select("id, kickoff, opponent, is_home, round, competition")
      .eq("status", "scheduled")
      .gte("kickoff", now.toISOString())
      .order("kickoff")
      .limit(3),
    supabase.from("news_posts").select("id, title, category, date, published").order("created_at", { ascending: false }).limit(5),
    supabase.from("postings").select("id, title, platform, posted_on, published").order("created_at", { ascending: false }).limit(5),
    count("news_posts"),
    count("postings", { column: "published", value: true }),
    count("sponsors"),
    count("matches"),
  ]);

  const playerRows = players.data ?? [];
  const activePlayers = playerRows.filter((p) => p.is_active);
  const lite = playerRows.map((p) => ({ id: p.id, name: p.name, number: p.number, isActive: p.is_active, hasPhoto: Boolean(p.photo_url) }));
  // 하나라도 못 읽으면 잘못된 알림(예: '명단에 없음')을 띄우지 않게 그 알림은 건너뛰고 안내한다
  const failed = [players, staff, news, settings, upcoming].some((r) => r.error);
  const alerts: AdminAlert[] = failed
    ? []
    : sortAlerts([
        ...rosterAlerts({ news: news.data ?? [], players: lite, staff: staff.data ?? [], today: kstToday(now) }),
        ...numberAlerts(lite),
        ...siteGapAlerts({
          upcomingMatches: upcoming.data?.length ?? 0,
          venueTransit: Boolean(settings.data?.venue_transit),
          venueParking: Boolean(settings.data?.venue_parking),
          contactEmail: Boolean(settings.data?.contact_email),
          contactPhone: Boolean(settings.data?.contact_phone),
          draftNews: (news.data ?? []).filter((n) => !n.published).length,
          activeWithoutPhoto: activePlayers.filter((p) => !p.photo_url).length,
        }),
      ]);

  const stats = [
    { href: "/admin/players", label: "활동 선수", value: activePlayers.length },
    { href: "/admin/staff", label: "코칭스태프/프런트", value: staff.data?.length ?? 0 },
    { href: "/admin/news", label: "구단소식", value: newsTotal },
    { href: "/admin/postings", label: "포스팅 (공개)", value: postingsShown },
    { href: "/admin/matches", label: "경기", value: matches },
    { href: "/admin/sponsors", label: "스폰서", value: sponsors },
  ];

  return (
    <>
      <section className={`${styles.panel} ${local.todo}`} aria-labelledby="todo-title">
        <div className={local.panelHead}>
          <h2 className={styles.panelTitle} id="todo-title">
            할 일 / 알림
          </h2>
          {!failed && <span className={local.count}>{alerts.filter((a) => a.level !== "info").length}건 확인 필요</span>}
        </div>
        {failed ? (
          <p className={styles.formMessage} role="alert">
            알림을 만들 자료를 불러오지 못했습니다. 새로고침해 주세요.
          </p>
        ) : alerts.length === 0 ? (
          <p className={styles.hint}>지금 처리할 일이 없습니다.</p>
        ) : (
          <ul className={local.alerts}>
            {alerts.map((a, i) => (
              <li key={i} className={local.alert}>
                <span className={`${local.level} ${local[a.level]}`}>{LEVEL_LABEL[a.level]}</span>
                <div className={local.alertText}>
                  <strong>{a.title}</strong>
                  {a.detail && <span>{a.detail}</span>}
                </div>
                <Link href={a.href} className={local.alertAction} target={a.href.startsWith("/admin") ? undefined : "_blank"}>
                  {a.action} →
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className={local.note}>
          선수/스태프 알림은 최근 6개월 구단소식(구단뉴스)의 영입/이적 제목과 명단을 비교해 만듭니다. 인스타그램에만 올라온 소식은
          구단소식에 글로 올려야 알림에 잡힙니다.
        </p>
      </section>

      <div className={local.grid}>
        <div className={local.cell}>
          <section className={styles.panel}>
            <div className={local.panelHead}>
              <h2 className={styles.panelTitle}>다음 경기</h2>
              <Link href="/admin/matches" className={local.more}>
                전체 →
              </Link>
            </div>
            {upcoming.data && upcoming.data.length > 0 ? (
              <ul className={local.list}>
                {upcoming.data.map((m) => {
                  const { date, time } = formatKickoff(m.kickoff);
                  return (
                    <li key={m.id}>
                      <Link href={`/admin/matches/${m.id}`}>
                        <strong>
                          {m.is_home ? "홈" : "원정"} vs {m.opponent}
                        </strong>
                        <span>
                          {date} {time}
                          {m.round && ` / ${m.round}`}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.hint}>
                예정된 경기가 없습니다. <Link href="/admin/matches/new">경기 추가 →</Link>
              </p>
            )}
          </section>
        </div>

        <div className={local.cell}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>한눈에 보기</h2>
            <div className={local.stats}>
              {stats.map((s) => (
                <Link key={s.href} href={s.href} className={local.stat}>
                  <span>{s.label}</span>
                  <strong>{s.value}</strong>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <div className={local.cell}>
          <section className={styles.panel}>
            <div className={local.panelHead}>
              <h2 className={styles.panelTitle}>최근 소식</h2>
              <Link href="/admin/news" className={local.more}>
                전체 →
              </Link>
            </div>
            {recentNews.data && recentNews.data.length > 0 ? (
              <ul className={local.list}>
                {recentNews.data.map((n) => (
                  <li key={n.id}>
                    <Link href={`/admin/news/${n.id}`}>
                      <strong>{n.title}</strong>
                      <span>
                        {NEWS_CATEGORY_LABEL[n.category as NewsCategory]} / {formatPostDate(n.date)}
                        {!n.published && " / 비공개"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.hint}>등록된 소식이 없습니다.</p>
            )}
          </section>
        </div>

        <div className={local.cell}>
          <section className={styles.panel}>
            <div className={local.panelHead}>
              <h2 className={styles.panelTitle}>최근 포스팅</h2>
              <Link href="/admin/postings" className={local.more}>
                전체 →
              </Link>
            </div>
            {recentPostings.data && recentPostings.data.length > 0 ? (
              <ul className={local.list}>
                {recentPostings.data.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/postings/${p.id}`}>
                      <strong>{p.title}</strong>
                      <span>
                        {POSTING_PLATFORM_LABEL[p.platform as PostingPlatform]} / {formatPostDate(p.posted_on)}
                        {!p.published && " / 숨김"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.hint}>등록된 포스팅이 없습니다.</p>
            )}
          </section>
        </div>
      </div>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>페이지별 고치는 곳</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>홈페이지 페이지</th>
                <th>관리자에서 고치는 곳</th>
                <th>
                  <span className="sr-only">페이지 보기</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_PAGE_MAP.map((pg) => (
                <tr key={pg.label}>
                  <td>{pg.label}</td>
                  <td>
                    {pg.edit ? (
                      <Link href={pg.edit.href} className={styles.rowLink}>
                        {pg.edit.label}
                      </Link>
                    ) : (
                      <span className={styles.hint}>관리자 개편 {pg.later}에서 추가</span>
                    )}
                  </td>
                  <td>
                    <Link href={pg.view} target="_blank" className={local.more}>
                      보기 ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
