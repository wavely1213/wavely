import type { Metadata } from "next";
import Link from "@/components/admin/AdminLink";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { NEWS_CATEGORY_LABEL } from "@/data/news";
import { requireAdminPage } from "@/lib/admin/auth";
import type { NewsRow } from "@/lib/data/rows";
import { formatPostDate } from "@/lib/format";
import { NEWS_CATEGORIES, toNewsCategory } from "@/lib/params";
import type { NewsCategory } from "@/types";
import news from "./news.module.css";

export const metadata: Metadata = { title: "구단소식" };

// 라우트 타입(.next/types)이 빌드 때 생성되므로 searchParams 타입은 직접 적는다 (PageProps 와 호환)
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type ListRow = Pick<NewsRow, "id" | "category" | "title" | "date" | "thumbnail_url" | "published" | "created_at">;

const TABS: Array<{ value: NewsCategory | null; label: string }> = [
  { value: null, label: "전체" },
  ...NEWS_CATEGORIES.map((c) => ({ value: c, label: NEWS_CATEGORY_LABEL[c] })),
];

export default function NewsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageTitle title="구단소식" description="공개로 저장한 글만 홈페이지 구단소식에 날짜 순으로 보입니다.">
        <Link href="/admin/news/new" className={styles.button}>
          + 소식 추가
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <NewsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewsList({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdminPage();
  const raw = (await searchParams).category;
  // 잘못된 값·여러 값은 전체로 본다
  const category = typeof raw === "string" ? toNewsCategory(raw) : null;

  let query = supabase.from("news_posts").select("id, category, title, date, thumbnail_url, published, created_at");
  if (category) query = query.eq("category", category);
  const { data, error } = await query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<ListRow[]>();
  const rows = data ?? [];

  return (
    <>
      <nav className={news.tabs} aria-label="분류">
        {TABS.map((t) => {
          const active = t.value === category;
          return (
            <Link
              key={t.label}
              href={t.value ? `/admin/news?category=${t.value}` : "/admin/news"}
              className={active ? styles.button : styles.buttonGhost}
              aria-current={active ? "page" : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {error ? (
        <p className={`${styles.panel} ${styles.empty}`}>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      ) : rows.length === 0 ? (
        <p className={`${styles.panel} ${styles.empty}`}>
          {category ? `${NEWS_CATEGORY_LABEL[category]}에 등록된 소식이 없습니다.` : "등록된 소식이 없습니다."}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>썸네일</th>
                <th>제목</th>
                <th>분류</th>
                <th>날짜</th>
                <th>공개</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.id}>
                  <td>
                    {n.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.thumbnail_url} alt="" className={styles.thumb} />
                    ) : (
                      <span className={styles.badge}>없음</span>
                    )}
                  </td>
                  <td className={styles.wrap}>
                    <Link href={`/admin/news/${n.id}`} className={styles.rowLink}>
                      {n.title}
                    </Link>
                  </td>
                  <td>{NEWS_CATEGORY_LABEL[n.category]}</td>
                  <td>{n.date ? formatPostDate(n.date) : "-"}</td>
                  <td>
                    {n.published ? (
                      <span className={`${styles.badge} ${styles.badgeBlue}`}>공개</span>
                    ) : (
                      <span className={styles.badge}>비공개</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
