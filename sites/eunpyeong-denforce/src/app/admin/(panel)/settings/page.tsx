import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import type { ClubSettingsRow } from "@/lib/data/rows";
import { getSiteContent } from "@/lib/repo";
import { savePreviewSettings } from "./actions";
import { PreviewSettingsForm } from "./PreviewSettingsForm";
import local from "./settings.module.css";

const KAKAO_DEBUGGER = "https://developers.kakao.com/tool/debugger/sharing";

export const metadata: Metadata = { title: "설정" };

/** 관리자 › 설정 (D-048) — 링크 미리보기 (예전 구단정보 화면 아래쪽에 있던 것, D-037·D-038) */
export default function SettingsPage() {
  return (
    <>
      <PageTitle title="설정" description="홈페이지/관리자 주소를 카카오톡/SNS에 보낼 때 뜨는 링크 미리보기를 정합니다." />
      <Suspense fallback={<AdminLoading />}>
        <PreviewPanel />
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
