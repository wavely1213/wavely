import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { AdminLoading, PageTitle } from "@/components/admin/PageTitle";
import styles from "@/components/admin/admin.module.css";
import { requireAdminPage } from "@/lib/admin/auth";
import { CONTENT_FIELDS, type FieldDef } from "@/lib/content/fields";
import { CONTENT_LISTS, type ListDef, type ListKey } from "@/lib/content/lists";
import { CONTENT_SECTIONS, findSection, LEGACY_SECTION_IDS, type ContentSection } from "@/lib/content/sections";
import { resolveContent } from "@/lib/content/values";
import { FOOTER_TOKEN_KINDS, FOOTER_TOKENS, footerTokens } from "@/lib/content/views";
import { contentMap, type ContentItemRow, type SiteContentRow } from "@/lib/data/rows";
import { getClubSettings, getStaff } from "@/lib/repo";
import { staffNameByRole } from "@/lib/staff";
import { saveContentSection } from "../actions";
import { ContentFieldsForm } from "../ContentFieldsForm";
import type { TokenInfo } from "../MarkupEditor";
import local from "../content.module.css";
import { SectionTabs } from "../SectionTabs";

// 라우트 타입은 빌드 때 생성되므로 params 타입을 직접 적는다
type Params = Promise<{ section: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const section = findSection((await params).section);
  return { title: section ? `홈페이지 내용 / ${section.label}` : "홈페이지 내용" };
}

export function generateStaticParams() {
  return CONTENT_SECTIONS.map((s) => ({ section: s.id }));
}

export default function ContentSectionPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <SectionBody params={params} />
    </Suspense>
  );
}

async function SectionBody({ params }: { params: Params }) {
  const id = (await params).section;
  if (Object.hasOwn(LEGACY_SECTION_IDS, id)) redirect(`/admin/content/${LEGACY_SECTION_IDS[id]}`);
  const section = findSection(id);
  if (!section) notFound();
  const { supabase } = await requireAdminPage();

  const keys = section.groups.flatMap((g) => [...g.keys]);
  const [content, items] = await Promise.all([
    supabase.from("site_content").select("key, value").in("key", keys).returns<SiteContentRow[]>(),
    section.lists.length > 0
      ? supabase
          .from("content_items")
          .select("id, list, title, body, link, image_url, sort_order")
          .in("list", [...section.lists])
          .order("sort_order")
          .returns<ContentItemRow[]>()
      : Promise.resolve({ data: [] as ContentItemRow[], error: null }),
  ]);

  const stored = contentMap(content.data ?? []);
  const shown = resolveContent(stored);
  const groups = section.groups.map((g) => ({
    title: g.title,
    fields: g.keys.map((key) => {
      const def: FieldDef = CONTENT_FIELDS[key];
      return { key, def, value: shown[key], customized: Object.hasOwn(stored, key) };
    }),
  }));

  // 푸터 글 편집기 — 값 이름의 지금 값 (미리보기용, 저장된 값 기준)
  const tokens = groups.some((g) => g.fields.some((f) => f.def.editor)) ? await footerTokenInfo(shown) : [];

  return (
    <>
      <PageTitle title={`홈페이지 내용 / ${section.label}`} description={section.description} />
      <SectionTabs current={section.id} />

      <section className={styles.panel}>
        <div className={local.panelHead}>
          <h2 className={styles.panelTitle}>{section.label}</h2>
          <Link href={section.view} target="_blank" className={local.viewLink}>
            이 페이지 보기 ↗
          </Link>
        </div>
        {content.error ? (
          // 불러오기 실패 시 기본값이 채워진 폼을 보여 주면 저장 때 바꾼 값을 지울 수 있으므로 폼을 숨긴다
          <p className={styles.formMessage} role="alert">
            내용을 불러오지 못했습니다. 새로고침해 주세요.
          </p>
        ) : (
          <ContentFieldsForm action={saveContentSection.bind(null, section.id)} groups={groups} tokens={tokens} />
        )}
      </section>

      {section.lists.map((list) => (
        <ListPanel key={list} list={list} rows={(items.data ?? []).filter((r) => r.list === list)} failed={Boolean(items.error)} />
      ))}

      <RelatedPanel section={section} />
    </>
  );
}

async function footerTokenInfo(shown: ReturnType<typeof resolveContent>): Promise<TokenInfo[]> {
  const [settings, staff] = await Promise.all([getClubSettings(), getStaff()]);
  const values = footerTokens(shown, settings, staffNameByRole(staff, "단장"));
  return FOOTER_TOKENS.map((t) => ({ name: t.name, desc: t.desc, value: values[t.name] ?? null, kind: FOOTER_TOKEN_KINDS[t.name] }));
}

/** 목록 표 — 이름을 누르면 수정 */
function ListPanel({ list, rows, failed }: { list: ListKey; rows: ContentItemRow[]; failed: boolean }) {
  const def: ListDef = CONTENT_LISTS[list];
  const cols = def.columns;
  return (
    <section className={styles.panel}>
      <div className={local.panelHead}>
        <h2 className={styles.panelTitle}>{def.label}</h2>
        {rows.length < def.max && (
          <Link href={`/admin/content/lists/${list}/new`} className={styles.button}>
            + 추가
          </Link>
        )}
      </div>
      <p className={local.note}>{def.description}</p>
      {failed ? (
        <p className={styles.empty}>목록을 불러오지 못했습니다. 새로고침해 주세요.</p>
      ) : rows.length === 0 ? (
        <p className={styles.empty}>등록된 항목이 없습니다.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>순서</th>
                {cols.image && <th>{cols.image.label}</th>}
                {cols.title && <th>{cols.title.label}</th>}
                {cols.body && <th>{cols.body.label}</th>}
                {cols.link && <th>{cols.link.label}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.sort_order}</td>
                  {cols.image && (
                    <td>
                      {r.image_url && (
                        // 관리자 미리보기는 원본 그대로 (최적화 불필요)
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image_url} alt="" className={styles.thumb} />
                      )}
                    </td>
                  )}
                  {cols.title && (
                    <td>
                      <Link href={`/admin/content/lists/${list}/${r.id}`} className={styles.rowLink}>
                        {r.title || "(이름 없음)"}
                      </Link>
                    </td>
                  )}
                  {cols.body && (
                    <td className={styles.wrap}>
                      {cols.body.format === "hex" && <span className={local.swatch} style={{ background: r.body }} aria-hidden="true" />}
                      {cols.body.format === "lines" ? r.body.split("\n").join(" / ") : r.body}
                    </td>
                  )}
                  {cols.link && <td className={styles.wrap}>{r.link}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RelatedPanel({ section }: { section: ContentSection }) {
  if (section.related.length === 0) return null;
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>같은 화면의 다른 내용</h2>
      <div className={local.related}>
        {section.related.map((r) => (
          <Link key={r.href} href={r.href}>
            {r.label} →
          </Link>
        ))}
      </div>
    </section>
  );
}
