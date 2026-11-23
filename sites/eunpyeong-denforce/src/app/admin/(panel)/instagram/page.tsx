import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { formatKstDateTime } from "@/lib/admin/accounts";
import { requireAdminPage } from "@/lib/admin/auth";
import {
  canMarkReviewed,
  INSTAGRAM_MAX_ATTEMPTS,
  instagramKindLabel,
  instagramPostUrl,
  instagramStatusLabel,
  needsReview,
  type InstagramPostRow,
  type InstagramSyncStateRow,
} from "@/lib/admin/instagram";
import { markInstagramReviewed } from "./actions";

export const metadata: Metadata = { title: "인스타 자동 반영" };

// 구단 인스타그램 자동 반영 (D-065, BR-029) — Supabase 서버 함수가 15분마다 넣은 기록. 여기서는 보고 '확인함'만 누른다.

export default function InstagramSyncPage() {
  return (
    <>
      <PageTitle
        title="인스타 자동 반영"
        description="구단 인스타그램(@eunpyeong_denforce)에 새 게시물이 올라오면 15분 안에 홈페이지에 자동으로 넣습니다. 확인할 것이 있으면 여기에 표시됩니다."
      />
      <Suspense fallback={<AdminLoading />}>
        <SyncLog />
      </Suspense>
      <Rules />
    </>
  );
}

async function SyncLog() {
  const { supabase } = await requireAdminPage();
  const [state, posts] = await Promise.all([
    supabase.from("instagram_sync_state").select("last_run_at, last_ok_at, last_error, last_warning, last_processed").eq("id", 1).maybeSingle<InstagramSyncStateRow>(),
    supabase.from("instagram_posts").select("code, kind, posted_at, status, actions, note, attempts").order("posted_at", { ascending: false }).limit(50),
  ]);
  if (state.error || posts.error) return <p className={`${styles.panel} ${styles.empty}`}>기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>;
  const s = state.data;
  const rows = (posts.data ?? []) as InstagramPostRow[];

  return (
    <>
      <section className={styles.panel} aria-labelledby="sync-state">
        <h2 className={styles.panelTitle} id="sync-state">
          자동 확인 상태
        </h2>
        <ul className={styles.hint}>
          <li>마지막 확인: {s?.last_run_at ? formatKstDateTime(s.last_run_at) : "아직 없음"}</li>
          <li>마지막 성공: {s?.last_ok_at ? formatKstDateTime(s.last_ok_at) : "아직 없음"}</li>
          {s?.last_error && (
            <li>
              <span className={`${styles.badge} ${styles.badgeYellow}`}>오류</span> {s.last_error}
            </li>
          )}
          {s?.last_warning && (
            <li>
              <span className={`${styles.badge} ${styles.badgeYellow}`}>확인</span> {s.last_warning}
            </li>
          )}
        </ul>
      </section>

      {rows.length === 0 ? (
        <p className={`${styles.panel} ${styles.empty}`}>자동으로 넣은 게시물이 아직 없습니다. 새 게시물이 올라오면 여기에 보입니다.</p>
      ) : (
        <div className={styles.tableWrap} style={{ marginTop: 24 }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>게시일</th>
                <th>종류</th>
                <th>한 일</th>
                <th>확인할 것</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td>
                    <a href={instagramPostUrl(r.code)} target="_blank" rel="noreferrer" className={styles.rowLink}>
                      {formatKstDateTime(r.posted_at)}
                    </a>
                  </td>
                  <td>{instagramKindLabel(r.kind)}</td>
                  <td className={styles.wrap} style={{ whiteSpace: "pre-line" }}>
                    {r.actions || "-"}
                  </td>
                  <td className={styles.wrap} style={{ whiteSpace: "pre-line" }}>
                    {r.note ?? "-"}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${needsReview(r.status) ? styles.badgeYellow : r.status === "done" ? styles.badgeBlue : ""}`}>
                      {instagramStatusLabel(r.status)}
                    </span>
                    {canMarkReviewed(r.status, r.attempts) ? (
                      <form action={markInstagramReviewed.bind(null, r.code)} style={{ marginTop: 8 }}>
                        <button type="submit" className={`${styles.buttonGhost} ${styles.buttonSmall}`}>
                          확인함
                        </button>
                      </form>
                    ) : (
                      r.status === "error" && (
                        <p className={styles.hint} style={{ marginTop: 8 }}>
                          다시 시도 중 ({r.attempts}/{INSTAGRAM_MAX_ATTEMPTS})
                        </p>
                      )
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

/** 무엇을 어디에 넣는지 (BR-029) */
function Rules() {
  const rules: Array<[string, string]> = [
    ["모든 게시물", "포스팅에 공개"],
    ["릴스", "구단영상에 공개"],
    ["WELCOME (영입)", "영입 기사 공개. 글에 포지션이 있으면 선수도 추가 (등번호 공란). 없으면 '확인 필요'에 선수 추가 안내"],
    ["GOOD LUCK / THANK YOU (작별)", "같은 이름 활동 선수가 한 명이면 활동 끄기 + 작별 기사 공개 (못 찾으면 '확인 필요'). 스태프는 기사만, 명단은 직접 정리"],
    ["MATCH DAY", "경기 일정 추가 (경기장에 '은평'이 있으면 홈, 아니면 원정으로 넣고 '확인 필요')"],
    ["경기결과", "최근 7일 안 같은 상대 경기에 점수와 득점자 입력"],
  ];
  return (
    <section className={styles.panel} style={{ marginTop: 24 }} aria-labelledby="sync-rules">
      <h2 className={styles.panelTitle} id="sync-rules">
        자동으로 넣는 것
      </h2>
      <ul className={styles.hint}>
        {rules.map(([what, how]) => (
          <li key={what}>
            <strong>{what}</strong>: {how}
          </li>
        ))}
      </ul>
      <p className={styles.hint} style={{ marginTop: 12 }}>
        자동으로 넣은 글과 경기도 각 메뉴에서 고치거나 지울 수 있습니다. 같은 게시물은 다시 넣지 않습니다.
      </p>
    </section>
  );
}
