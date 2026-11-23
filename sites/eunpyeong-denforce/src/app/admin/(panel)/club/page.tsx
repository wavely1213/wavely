import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { AlumniRow, ClubSettingsRow, HistoryRow } from "@/lib/data/rows";
import { saveClubSettings } from "./actions";
import { ClubSettingsForm } from "./ClubSettingsForm";
import local from "./club.module.css";

export const metadata: Metadata = { title: "구단정보" };

export default function ClubAdminPage() {
  return (
    <>
      <PageTitle
        title="구단정보"
        description="구단소개/오시는 길/문의 페이지와 하단 푸터에 보이는 정보, 구단소개의 배출 풋살 국가대표, 연혁 페이지에 보이는 연혁을 관리합니다. 링크 미리보기는 설정에서 고칩니다."
      />
      <Suspense fallback={<AdminLoading />}>
        <ClubPanels />
      </Suspense>
    </>
  );
}

async function ClubPanels() {
  const { supabase } = await requireAdminPage();
  const [settings, history, alumni] = await Promise.all([
    supabase
      .from("club_settings")
      .select(
        "intro, contact_email, contact_phone, contact_address, instagram_url, youtube_url, venue_address, venue_transit, venue_parking",
      )
      .eq("id", 1)
      .maybeSingle<ClubSettingsRow>(),
    supabase.from("history_items").select("id, year, text, sort_order").order("sort_order").returns<HistoryRow[]>(),
    supabase
      .from("national_team_alumni")
      .select("id, name, position, years, sort_order")
      .order("sort_order")
      .returns<AlumniRow[]>(),
  ]);

  return (
    <>
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>구단정보</h2>
        {settings.error ? (
          // 불러오기 실패 시 빈 폼을 보여주면 저장 때 기존 값을 지울 수 있으므로 폼을 숨긴다
          <p className={styles.formMessage} role="alert">
            구단정보를 불러오지 못했습니다. 새로고침해 주세요.
          </p>
        ) : (
          // 행이 없으면(data: null) 빈 폼 — 저장하면 행이 만들어진다
          <ClubSettingsForm action={saveClubSettings} initial={settings.data} />
        )}
      </section>

      <section className={styles.panel}>
        <div className={local.panelHead}>
          <h2 className={styles.panelTitle}>배출 풋살 국가대표</h2>
          <Link href="/admin/club/alumni/new" className={styles.button}>
            + 추가
          </Link>
        </div>
        <AlumniTable rows={alumni.data ?? []} failed={Boolean(alumni.error)} />
      </section>


      <section className={styles.panel}>
        <div className={local.panelHead}>
          <h2 className={styles.panelTitle}>연혁</h2>
          <Link href="/admin/club/history/new" className={styles.button}>
            + 연혁 추가
          </Link>
        </div>
        <HistoryTable rows={history.data ?? []} failed={Boolean(history.error)} />
      </section>
    </>
  );
}

function HistoryTable({ rows, failed }: { rows: HistoryRow[]; failed: boolean }) {
  if (failed) return <p className={styles.empty}>연혁을 불러오지 못했습니다. 새로고침해 주세요.</p>;
  if (rows.length === 0) return <p className={styles.empty}>등록된 연혁이 없습니다.</p>;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>순서</th>
            <th>연도</th>
            <th>내용</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.id}>
              <td>{h.sort_order}</td>
              <td>{h.year}</td>
              <td className={styles.wrap}>
                <Link href={`/admin/club/history/${h.id}`} className={styles.rowLink}>
                  {h.text}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 구단소개 '배출 풋살 국가대표' 표 — 이름을 누르면 수정 (D-043) */
function AlumniTable({ rows, failed }: { rows: AlumniRow[]; failed: boolean }) {
  if (failed) return <p className={styles.empty}>배출 국가대표를 불러오지 못했습니다. 새로고침해 주세요.</p>;
  if (rows.length === 0) return <p className={styles.empty}>등록된 사람이 없습니다. 비어 있으면 구단소개에서 이 표가 보이지 않습니다.</p>;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>순서</th>
            <th>이름</th>
            <th>포지션</th>
            <th>국가대표 발탁</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>{a.sort_order}</td>
              <td>
                <Link href={`/admin/club/alumni/${a.id}`} className={styles.rowLink}>
                  {a.name}
                </Link>
              </td>
              <td>{a.position}</td>
              <td className={styles.wrap}>{a.years}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
