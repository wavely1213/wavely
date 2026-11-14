import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import { folderLink } from "@/lib/admin/drive";
import type { ClubSettingsRow } from "@/lib/data/rows";
import { getSiteContent } from "@/lib/repo";
import { saveDriveFolder, saveMatchdayFolder, savePreviewSettings } from "./actions";
import { DriveFolderForm } from "./DriveFolderForm";
import { PreviewSettingsForm } from "./PreviewSettingsForm";
import local from "./settings.module.css";

const KAKAO_DEBUGGER = "https://developers.kakao.com/tool/debugger/sharing";

export const metadata: Metadata = { title: "설정" };

/** 관리자 › 설정 (D-048) — 링크 미리보기 (예전 구단정보 화면 아래쪽에 있던 것, D-037·D-038) */
export default function SettingsPage() {
  return (
    <>
      <PageTitle title="설정" description="홈페이지/관리자 주소를 카카오톡/SNS에 보낼 때 뜨는 링크 미리보기와 드라이브 자료함 연결을 정합니다." />
      <Suspense fallback={<AdminLoading />}>
        <PreviewPanel />
        <DrivePanel />
        <MatchdayPosterPanel />
      </Suspense>
    </>
  );
}

async function PreviewPanel() {
  const { supabase } = await requireAdminPage();
  const [settings, content] = await Promise.all([
    supabase
      .from("club_settings")
      .select("og_image_url, og_title, og_description, admin_og_image_url, admin_og_title, admin_og_description")
      .eq("id", 1)
      .maybeSingle<Pick<ClubSettingsRow, "og_image_url" | "og_title" | "og_description" | "admin_og_image_url" | "admin_og_title" | "admin_og_description">>(),
    getSiteContent(),
  ]);

  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>링크 미리보기 (카카오톡/SNS)</h2>
      <p className={local.note}>
        주소를 카카오톡/문자/SNS에 보낼 때 뜨는 이미지/제목/설명입니다. 홈페이지 주소와 관리자 주소를 따로 정하고, 비워 두면
        기본값이 쓰입니다. 구단소식 글/선수 페이지 주소는 그 글/선수의 사진과 제목으로 뜹니다. 바꾼 뒤에도 카카오톡에 예전
        미리보기가 보이면{" "}
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
          siteName={content["site.name"]}
          siteDescription={content["site.description"]}
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
        <p className={styles.empty}>관리자 › 구단정보를 먼저 저장해 주세요.</p>
      )}
    </section>
  );
}

/** 드라이브 자료함 연결 (D-081) — 최고 관리자만 바꾼다. 관리자는 연결 상태만 본다 */
async function DrivePanel() {
  const { supabase, role } = await requireAdminPage();
  const { data, error } = await supabase.from("drive_settings").select("drive_folder_id").eq("id", 1).maybeSingle<{ drive_folder_id: string | null }>();
  const id = data?.drive_folder_id ?? null;
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>드라이브 자료함 연결</h2>
      <p className={local.note}>
        구단 구글 드라이브 폴더를 연결하면 관리자 › 드라이브 자료함과 사진 칸의 &apos;드라이브에서 가져오기&apos;에서 파일을 골라 쓸 수 있습니다.
        자동으로 올라가지는 않습니다. 드라이브 API 키(GOOGLE_DRIVE_API_KEY)는 이 화면이 아니라 Supabase 함수 비밀값에 최고 관리자가 넣습니다.
      </p>
      {error ? (
        <p className={styles.formMessage} role="alert">
          연결 상태를 불러오지 못했습니다. 새로고침해 주세요.
        </p>
      ) : role === "owner" ? (
        <DriveFolderForm action={saveDriveFolder} initialLink={id ? folderLink(id) : ""} />
      ) : (
        <p className={local.note}>
          {id ? (
            <>
              연결됨:{" "}
              <a href={folderLink(id)} target="_blank" rel="noreferrer">
                드라이브 폴더 열기
              </a>
            </>
          ) : (
            "아직 연결하지 않았습니다. 최고 관리자가 연결합니다."
          )}
        </p>
      )}
    </section>
  );
}

type PosterSyncState = { last_run_at: string | null; last_ok_at: string | null; last_status: string | null; last_error: string | null; last_applied: string | null; last_notes: string | null };

const POSTER_STATUS: Record<string, string> = {
  ok: "정상",
  no_key: "드라이브 API 키 필요 (Supabase 함수 비밀값 GOOGLE_DRIVE_API_KEY)",
  no_folder: "포스터 폴더가 연결되지 않음",
  error: "오류",
};

const kst = (iso: string | null) => (iso ? new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ") : "없음");

/** 매치데이 포스터 폴더 (D-096) — 최고 관리자만 바꾼다. 자동 확인 상태는 관리자 모두 본다. 마이그레이션 전에는 안내만 */
async function MatchdayPosterPanel() {
  const { supabase, role } = await requireAdminPage();
  const [folder, state] = await Promise.all([
    supabase.from("drive_settings").select("matchday_folder_id").eq("id", 1).maybeSingle<{ matchday_folder_id: string | null }>(),
    supabase.from("matchday_poster_sync_state").select("*").eq("id", 1).maybeSingle<PosterSyncState>(),
  ]);
  const id = folder.data?.matchday_folder_id ?? null;
  const s = state.data;
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>매치데이 포스터 폴더</h2>
      <p className={local.note}>
        이 드라이브 폴더 안의 날짜 폴더(예: 11/15 vs 노원제너FS (AWAY))에서 MATCH-DAY 이미지와 이름에 FULL 이 든 이미지를 찾아 경기의
        포스터 칸이 비어 있을 때만 넣습니다. 경기 날에는 15분마다, 다른 날에는 3시간마다 확인합니다. 관리자 › 경기에서 직접 올린 포스터가
        우선이고, 지운 칸은 다시 채우지 않습니다.
      </p>
      {folder.error ? (
        <p className={local.note}>아직 준비 중입니다(DB 반영 전).</p>
      ) : role === "owner" ? (
        <DriveFolderForm action={saveMatchdayFolder} initialLink={id ? folderLink(id) : ""} name="matchday_folder" label="포스터 폴더 링크" />
      ) : (
        <p className={local.note}>
          {id ? (
            <a href={folderLink(id)} target="_blank" rel="noreferrer">
              포스터 폴더 열기
            </a>
          ) : (
            "아직 연결하지 않았습니다. 최고 관리자가 연결합니다."
          )}
        </p>
      )}
      {s && (
        <dl className={local.note}>
          <dt>자동 확인</dt>
          <dd>
            {s.last_status ? (POSTER_STATUS[s.last_status] ?? s.last_status) : "아직 실행 전"} (마지막 실행 {kst(s.last_run_at)}, 마지막 성공 {kst(s.last_ok_at)})
          </dd>
          {s.last_error && (
            <>
              <dt>오류</dt>
              <dd>{s.last_error}</dd>
            </>
          )}
          {s.last_applied && (
            <>
              <dt>최근에 넣은 것</dt>
              <dd>{s.last_applied}</dd>
            </>
          )}
          {s.last_notes && (
            <>
              <dt>확인할 것</dt>
              <dd>{s.last_notes}</dd>
            </>
          )}
        </dl>
      )}
    </section>
  );
}
