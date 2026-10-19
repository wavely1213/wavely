import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { ADMIN_PAGE_MAP } from "@/config/admin-pages";
import { PRIVACY_PAGE_ENABLED } from "@/config/site";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { POSTING_PLATFORM_LABEL } from "@/data/postings";
import { numberAlerts, reviewAlerts, rosterAlerts, siteGapAlerts, sortAlerts, type AdminAlert, type AlertLevel } from "@/lib/admin/alerts";
import { requireAdminPage } from "@/lib/admin/auth";
import { adminUserIds } from "@/lib/admin/review";
import { isPendingReview } from "@/lib/admin/roles";
import { formatKickoff, formatPostDate } from "@/lib/format";
import type { NewsCategory, PostingPlatform } from "@/types";
import local from "./dashboard.module.css";

export const metadata: Metadata = { title: "대시보드" };

const LEVEL_LABEL: Record<AlertLevel, string> = { warn: "꼭 확인", check: "확인", info: "참고" };

export default function DashboardPage() {
  return (
    <>
      {/* 새 글 쓰기 같은 빠른 작업 버튼은 두지 않는다 — 각 메뉴의 목록에서 '추가' (소유자 판단) */}
      <PageTitle title="대시보드" description="저장한 내용은 홈페이지에 바로 반영됩니다 (늦어도 1분 이내)." />
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
  const ctx = await requireAdminPage();
  const { supabase } = ctx;
  const now = new Date();
  const count = async (table: string, filter?: { column: string; value: boolean }) => {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) q = q.eq(filter.column, filter.value);
    const { count } = await q;
    return count ?? 0;
  };

  const [players, staff, news, settings, upcoming, scheduled, recentNews, recentPostings, newsTotal, postingsShown, sponsors, matches, privacy, draftPostings, admins] = await Promise.all([
    supabase.from("players").select("id, name, number, is_active, photo_url"),
    supabase.from("staff").select("id, name, role"),
    supabase.from("news_posts").select("title, date, category, published, created_by"),
    supabase.from("club_settings").select("venue_transit, venue_parking, contact_email, contact_phone").eq("id", 1).maybeSingle(),
    supabase
      .from("matches")
      .select("id, kickoff, opponent, is_home, round, competition")
      .eq("status", "scheduled")
      .gte("kickoff", now.toISOString())
      .order("kickoff")
      .limit(3),
    // 알림용 — 공개 경기 일정과 같은 기준(상태 '예정', BR-003). 시간이 지난 '예정' 경기는 결과 입력 알림
    supabase.from("matches").select("kickoff").eq("status", "scheduled"),
    supabase.from("news_posts").select("id, title, category, date, published").order("created_at", { ascending: false }).limit(5),
    supabase.from("postings").select("id, title, platform, posted_on, published").order("created_at", { ascending: false }).limit(5),
    count("news_posts"),
    count("postings", { column: "published", value: true }),
    count("sponsors"),
    count("matches"),
    // 개인정보처리방침 — 바꾼 값만 저장되므로 행이 있으면 본문을 쓴 것 (행이 없으면 '준비 중')
    supabase.from("site_content").select("key").eq("key", "privacy.body").maybeSingle(),
    // 검토 대기 (D-057) — 미디어 계정이 올린 비공개 글
    supabase.from("postings").select("published, created_by").eq("published", false),
    adminUserIds(ctx),
  ]);

  const playerRows = players.data ?? [];
  const activePlayers = playerRows.filter((p) => p.is_active);
  const lite = playerRows.map((p) => ({ id: p.id, name: p.name, number: p.number, isActive: p.is_active, hasPhoto: Boolean(p.photo_url) }));
  // 하나라도 못 읽으면 잘못된 알림(예: '명단에 없음')을 띄우지 않게 그 알림은 건너뛰고 안내한다
  // 검토 대기 판단에 쓰는 관리자 ID 목록(admins)을 못 읽어도 알림을 만들지 않는다
  const failed = [players, staff, news, settings, upcoming, scheduled, privacy, draftPostings].some((r) => r.error) || admins === null;
  const newsRows = news.data ?? [];
  const pendingNews = newsRows.filter((n) => isPendingReview(n, admins)).length;
  const scheduledRows = scheduled.data ?? [];
  const alerts: AdminAlert[] = failed
    ? []
    : sortAlerts([
        ...reviewAlerts({ news: pendingNews, postings: (draftPostings.data ?? []).filter((p) => isPendingReview(p, admins)).length }),
        ...rosterAlerts({ news: newsRows, players: lite, staff: staff.data ?? [], today: kstToday(now) }),
        ...numberAlerts(lite),
        ...siteGapAlerts({
          upcomingMatches: scheduledRows.length,
          pastScheduled: scheduledRows.filter((m) => new Date(m.kickoff) < now).length,
          venueTransit: Boolean(settings.data?.venue_transit),
          venueParking: Boolean(settings.data?.venue_parking),
          contactEmail: Boolean(settings.data?.contact_email),
          contactPhone: Boolean(settings.data?.contact_phone),
          // 검토 대기 글은 위 알림으로 따로 알린다
          draftNews: newsRows.filter((n) => !n.published).length - pendingNews,
          activeWithoutPhoto: activePlayers.filter((p) => !p.photo_url).length,
          // 개인정보처리방침 페이지를 꺼 두면 '준비 중' 알림도 띄우지 않는다 (D-055)
          privacyWritten: !PRIVACY_PAGE_ENABLED || Boolean(privacy.data),
        }),
      ]);

  const pending = alerts.filter((a) => a.level !== "info").length;

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
          {pending > 0 && <span className={local.count}>{pending}건 확인 필요</span>}
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
              <li key={i}>
                {/* 알림 한 줄 전체가 바로가기 — 휴대폰에서는 바로가기 이름을 숨기고 화살표만 */}
                <Link href={a.href} className={local.alert} target={a.href.startsWith("/admin") ? undefined : "_blank"}>
                  <span className={`${local.level} ${local[a.level]}`}>{LEVEL_LABEL[a.level]}</span>
                  <span className={local.alertText}>
                    <strong>{a.title}</strong>
                    {a.detail && <span>{a.detail}</span>}
                  </span>
                  <span className={local.alertAction}>
                    <span className={local.actionLabel}>{a.action} </span>→
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className={local.note}>선수/스태프 알림은 최근 6개월 구단뉴스의 영입/이적 글 기준입니다.</p>
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
