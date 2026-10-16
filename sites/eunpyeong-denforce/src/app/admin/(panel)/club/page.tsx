import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { ClubSettingsRow, HistoryRow } from "@/lib/data/rows";
import { saveClubSettings } from "./actions";
import { ClubSettingsForm } from "./ClubSettingsForm";
import local from "./club.module.css";
import { savePreviewSettings } from "./preview-actions";
import { PreviewSettingsForm } from "./PreviewSettingsForm";

const KAKAO_DEBUGGER = "https://developers.kakao.com/tool/debugger/sharing";

export const metadata: Metadata = { title: "구단정보" };

export default function ClubAdminPage() {
  return (
    <>
      <PageTitle
        title="구단정보"
        description="구단소개·오시는 길·문의 페이지와 하단 푸터에 보이는 정보, 링크 미리보기 이미지, 연혁 페이지에 보이는 연혁을 관리합니다."
      />
      <Suspense fallback={<AdminLoading />}>
        <ClubPanels />
      </Suspense>
    </>
  );
}

async function ClubPanels() {
  const { supabase } = await requireAdminPage();
  const [settings, history] = await Promise.all([
    supabase
      .from("club_settings")
      .select(
        "intro, contact_email, contact_phone, contact_address, instagram_url, youtube_url, venue_address, venue_transit, venue_parking, og_image_url, og_title, og_description, admin_og_image_url, admin_og_title, admin_og_description",
      )
      .eq("id", 1)
      .maybeSingle<ClubSettingsRow>(),
    supabase.from("history_items").select("id, year, text, sort_order").order("sort_order").returns<HistoryRow[]>(),
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
        <h2 className={styles.panelTitle}>링크 미리보기 (카카오톡·SNS)</h2>
        <p className={local.note}>
          주소를 카카오톡·문자·SNS에 보낼 때 뜨는 이미지·제목·설명입니다. 홈페이지 주소와 관리자 주소를 따로 정하고,
          비워 두면 기본값이 쓰입니다. 구단소식 글·선수 페이지 주소는 그 글·선수의 사진과 제목으로 뜹니다. 바꾼 뒤에도
          카카오톡에 예전 미리보기가 보이면{" "}
          <a href={KAKAO_DEBUGGER} target="_blank" rel="noreferrer">
            카카오 공유 디버거
          </a>
          에서 주소(https://eunpyeong-fs.com/ 등)를 넣고 캐시 초기화를 눌러 주세요.
        </p>
        {settings.error ? (
          <p className={styles.formMessage} role="alert">
            미리보기 설정을 불러오지 못했습니다. 새로고침해 주세요.
          </p>
        ) : settings.data ? (
          <PreviewSettingsForm
            action={savePreviewSettings}
            initial={{
              og_image_url: settings.data.og_image_url ?? null,
              og_title: settings.data.og_title ?? null,
              og_description: settings.data.og_description ?? null,
              admin_og_image_url: settings.data.admin_og_image_url ?? null,
              admin_og_title: settings.data.admin_og_title ?? null,
              admin_og_description: settings.data.admin_og_description ?? null,
            }}
          />
        ) : (
          <p className={styles.empty}>위의 구단정보를 먼저 저장해 주세요.</p>
        )}
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
