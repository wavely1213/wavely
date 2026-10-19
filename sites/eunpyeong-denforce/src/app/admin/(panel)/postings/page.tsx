import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import { PublishBadge } from "@/components/admin/PublishBadge";
import styles from "@/components/admin/admin.module.css";
import { POSTING_KIND_LABEL, POSTING_PLATFORM_LABEL } from "@/data/postings";
import { requireAdminPage } from "@/lib/admin/auth";
import { mediaEmails } from "@/lib/admin/review";
import { isPendingReview, STAFF_ROLES } from "@/lib/admin/roles";
import type { PostingRow } from "@/lib/data/rows";
import { formatPostDate } from "@/lib/format";
import { POSTING_KINDS } from "@/lib/postings";
import type { PostingKind } from "@/types";
import local from "./postings.module.css";

export const metadata: Metadata = { title: "포스팅" };

// 라우트 타입(.next/types)이 빌드 때 생성되므로 searchParams 타입은 직접 적는다 (PageProps 와 호환)
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type ListRow = Pick<PostingRow, "id" | "kind" | "platform" | "title" | "author" | "url" | "thumbnail_url" | "posted_on" | "published" | "created_by">;

const TABS: Array<{ value: PostingKind | null; label: string }> = [
  { value: null, label: "전체" },
  ...POSTING_KINDS.map((k) => ({ value: k, label: POSTING_KIND_LABEL[k] })),
];

export default function PostingsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageTitle
        title="포스팅"
        description="구단 이름으로 올라온 바깥 글(블로그/카페/기사/유튜브) 모음입니다. 공개한 글만 구단소식 > 포스팅에 날짜 순으로 보이고, 누르면 원문으로 갑니다."
      >
        <Link href="/admin/postings/new" className={styles.button}>
          + 포스팅 추가
        </Link>
      </PageTitle>
      <Suspense fallback={<AdminLoading />}>
        <PostingList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PostingList({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requireAdminPage(STAFF_ROLES);
  const { supabase } = ctx;
  const raw = (await searchParams).kind;
  // 잘못된 값·여러 값은 전체로 본다
  const kind = typeof raw === "string" && (POSTING_KINDS as readonly string[]).includes(raw) ? (raw as PostingKind) : null;

  let query = supabase.from("postings").select("id, kind, platform, title, author, url, thumbnail_url, posted_on, published, created_by");
  if (kind) query = query.eq("kind", kind);
  const [{ data, error }, media] = await Promise.all([
    query.order("posted_on", { ascending: false }).order("title").returns<ListRow[]>(),
    mediaEmails(ctx),
  ]);
  const rows = data ?? [];

  return (
    <>
      <nav className={local.tabs} aria-label="분류">
        {TABS.map((t) => {
          const active = t.value === kind;
          return (
            <Link
              key={t.label}
              href={t.value ? `/admin/postings?kind=${t.value}` : "/admin/postings"}
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
          {kind ? `${POSTING_KIND_LABEL[kind]}에 등록된 글이 없습니다.` : "등록된 글이 없습니다."}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>사진</th>
                <th>제목</th>
                <th>분류</th>
                <th>출처</th>
                <th>작성자</th>
                <th>날짜</th>
                <th>공개</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail_url} alt="" className={styles.thumb} loading="lazy" decoding="async" />
                    ) : (
                      <span className={styles.badge}>없음</span>
                    )}
                  </td>
                  <td className={styles.wrap}>
                    <Link href={`/admin/postings/${p.id}`} className={styles.rowLink}>
                      {p.title}
                    </Link>
                  </td>
                  <td>{POSTING_KIND_LABEL[p.kind]}</td>
                  <td>{POSTING_PLATFORM_LABEL[p.platform]}</td>
                  <td className={styles.wrap}>{p.author || "-"}</td>
                  <td>{formatPostDate(p.posted_on)}</td>
                  <td>
                    <PublishBadge published={p.published} pending={isPendingReview(p, media)} />
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
