// 홈페이지 내용 값 다루기 — 순수 함수만 (테스트: content.test.ts). 저장 전 검사와 화면용 값 만들기가 같은 규칙을 쓴다.
// 상대 경로·.ts 확장자 — npm test(node)가 별칭(@/) 없이 바로 읽게
import { isCalendarDate } from "../admin/form.ts";
import { CONTENT_FIELDS, type ContentKey, type FieldDef, type SiteContent } from "./fields.ts";
import type { ColumnDef, ListColumn, ListDef } from "./lists";

/** 사이트 안 주소(/…) 또는 http(s):// 주소. '//host'·'/\\host' 는 바깥 사이트로 가므로 사이트 안 주소로 받지 않는다 */
const LINK = /^(\/(?![/\\])\S*|https?:\/\/\S+)$/;
/** 사진: 사이트 안 파일(/…) 또는 업로드한 사진 주소 (로컬 Supabase 는 http — next.config 가 허용한다) */
const IMAGE = /^(\/(?![/\\])\S*|https?:\/\/\S+)$/;

export function isLink(v: string): boolean {
  return LINK.test(v);
}

/** 바깥 사이트 주소인지 — 새 창으로 연다 */
export function isExternalLink(v: string): boolean {
  return /^https?:\/\//.test(v);
}

export type Normalized = { ok: true; value: string | null } | { ok: false; error: string };

/**
 * 입력값 정리·검사. value 가 null 이면 '비어 있음'(기본값을 쓴다).
 * text 는 줄바꿈을 공백으로, lines 는 빈 줄을 빼고 한 줄에 하나로 맞춘다.
 */
export function normalizeValue(def: FieldDef, raw: string): Normalized {
  let v = raw.replace(/\r\n?/g, "\n");
  switch (def.kind) {
    case "text":
    case "link":
    case "image":
    case "date":
      v = v.replace(/\s*\n\s*/g, " ").trim();
      break;
    case "lines":
      v = v
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n");
      break;
    case "multiline":
      v = v.trim();
      break;
  }
  if (!v) return { ok: true, value: null };
  if (def.max && v.length > def.max) return { ok: false, error: `${def.label}은(는) ${def.max}자 이하로 입력해 주세요.` };
  if (def.kind === "date" && !isCalendarDate(v)) return { ok: false, error: `${def.label}은(는) YYYY-MM-DD 형식의 날짜로 입력해 주세요.` };
  if (def.kind === "link" && !LINK.test(v))
    return { ok: false, error: `${def.label}은(는) /로 시작하는 사이트 안 주소나 https:// 주소로 입력해 주세요.` };
  if (def.kind === "image" && !IMAGE.test(v)) return { ok: false, error: `${def.label} 주소가 올바르지 않습니다.` };
  return { ok: true, value: v };
}

/**
 * 저장할 값 — null 이면 DB 행을 지운다(기본값으로). 비웠거나 기본값과 같으면 null:
 * 바꾼 값만 저장해야 나중에 코드 기본값을 고쳤을 때 그대로 따라간다.
 */
export function storedValue(def: FieldDef, raw: string): Normalized {
  const n = normalizeValue(def, raw);
  if (!n.ok || n.value === null) return n;
  return { ok: true, value: n.value === def.default ? null : n.value };
}

/** DB 에 저장된 값(바꾼 값만) → 화면에 쓸 값 전체. 모르는 키·빈 값·형식이 틀린 값은 버리고 기본값 */
export function resolveContent(stored: Readonly<Record<string, string>>): SiteContent {
  const out = {} as Record<ContentKey, string>;
  for (const key of Object.keys(CONTENT_FIELDS) as ContentKey[]) {
    const def: FieldDef = CONTENT_FIELDS[key];
    const n = Object.hasOwn(stored, key) ? normalizeValue(def, stored[key]) : null;
    out[key] = n?.ok && n.value !== null ? n.value : def.default;
  }
  return out;
}

/** lines 값 → 배열 */
export function contentLines(v: string): string[] {
  return v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/** YYYY-MM-DD → YYYY */
export function yearOf(date: string): string {
  return date.slice(0, 4);
}

export type ItemInput = Record<Exclude<ListColumn, "image">, string>;

/** 목록 한 줄의 글 칸 검사 — 쓰지 않는 칸은 빈 값으로 맞춘다 */
export function readItem(def: ListDef, raw: Partial<ItemInput>): { values: ItemInput; errors: Partial<Record<ListColumn, string>> } {
  const values: ItemInput = { title: "", body: "", link: "" };
  const errors: Partial<Record<ListColumn, string>> = {};
  for (const col of ["title", "body", "link"] as const) {
    const c: ColumnDef | undefined = def.columns[col];
    if (!c) continue;
    let v = (raw[col] ?? "").replace(/\r\n?/g, "\n");
    v = c.multiline ? v.trim() : v.replace(/\s*\n\s*/g, " ").trim();
    values[col] = v;
    if (!v) {
      if (c.required) errors[col] = `${c.label}을(를) 입력해 주세요.`;
      continue;
    }
    if (c.max && v.length > c.max) errors[col] = `${c.label}은(는) ${c.max}자 이하로 입력해 주세요.`;
    else if (col === "link" && !LINK.test(v)) errors[col] = `${c.label}은(는) /로 시작하는 사이트 안 주소나 https:// 주소로 입력해 주세요.`;
  }
  return { values, errors };
}
