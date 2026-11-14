// 푸터 정보 줄 글 — '**이름표** 값' 묶음 + {값 이름} (D-048). 순수 함수만 (테스트: markup.test.ts)
// 예) **창단** {창단연도} **홈구장** {홈구장}
//     → 이름표 '창단'(밝은 굵은 글씨) + 값 '2012', 이름표 '홈구장' + 값 '은평다목적체육관'
// 값 이름이 비어 있으면(예: 사무국 주소 없음) 그 묶음은 숨기고, 남는 ' / ' 는 지운다.

export type MarkupGroup = { label: string; value: string };

/** 한 줄 → 묶음들. '**' 사이가 이름표, 그 뒤 다음 '**' 전까지가 값. 첫 '**' 앞 글은 이름표 없는 묶음 */
export function parseMarkupLine(line: string): MarkupGroup[] {
  const parts = line.split(/\*\*([^*\n]*)\*\*/);
  const groups: MarkupGroup[] = [];
  const head = parts[0].trim();
  if (head) groups.push({ label: "", value: head });
  for (let i = 1; i < parts.length; i += 2) {
    const label = parts[i].trim();
    const value = (parts[i + 1] ?? "").trim();
    if (label || value) groups.push({ label, value });
  }
  return groups;
}

/** 여러 줄 → 줄마다 묶음들 (빈 줄 제외) */
export function parseMarkup(src: string): MarkupGroup[][] {
  return src
    .split(/\r?\n/)
    .map(parseMarkupLine)
    .filter((g) => g.length > 0);
}

/** 이름표·값에 넣으면 안 되는 글자 정리 — '*'(이름표 표시)와 줄바꿈 */
function cleanLabel(s: string) {
  return s.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function cleanValue(s: string) {
  return s.replace(HOLD_CHARS, "").replace(/\*{2,}/g, "*").replace(/\s+/g, " ").trim();
}

/**
 * 묶음들 → 저장할 글 (parseMarkup 의 반대).
 * 이름표 없는 칸이 줄 맨 앞이 아니면 '**** 값' 으로 쓴다 — 그냥 쓰면 앞 칸 값에 붙어 한 칸이 되어 버린다.
 */
export function serializeMarkup(lines: MarkupGroup[][]): string {
  return lines
    .map((groups) =>
      groups
        .map((g) => ({ label: cleanLabel(g.label), value: cleanValue(g.value) }))
        .filter((g) => g.label || g.value)
        .map((g, i) => {
          if (!g.label) return i === 0 ? g.value : `**** ${g.value}`;
          return g.value ? `**${g.label}** ${g.value}` : `**${g.label}**`;
        })
        .join(" "),
    )
    .filter(Boolean)
    .join("\n");
}

/** {값 이름} — 화면에 보일 때 실제 값으로 바뀐다 */
export const TOKEN = /\{([^{}\s]+)\}/g;

export type TokenValues = Readonly<Record<string, string | null | undefined>>;
/** 값 이름의 종류 — 이메일은 값 전체를 메일 링크, 전화번호는 값 전체를 줄바꿈 없이 (글자 모양으로 다시 찾지 않는다) */
export type TokenKinds = Readonly<Record<string, "email" | "phone">>;

export type Segment = { kind: "text" | "email" | "phone"; text: string };
export type RenderedGroup = { label: string; segments: Segment[] };

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** 직접 쓴 전화번호 — 010-1234-5678 / 02 123 4567 / +82-10-1234-5678 / 1588-1234 */
const PHONE = /(?<!\d)(?:(?:\+82[- ]?\d{1,2}|0\d{1,2})[- ]\d{3,4}[- ]\d{4}|1[5-9]\d{2}-\d{4})(?!\d)/g;
/** 값 이름 자리표 (화면 글 안에서 잠시 쓴다) — 관리자가 쓴 글에서는 지운다 */
const HOLD_CHARS = /[\uE000\uE001]/g;
const HOLD = /\uE000(\d+)\uE001/g;
/** 띄어쓴 '/' 하나 (주소의 'https://'·'1/2' 는 아님) */
const SLASH = /(?<=^|\s)\/(?=\s|$)/;

/** 직접 쓴 글 → 글/이메일(메일 링크)/전화번호(줄바꿈 안 함) 조각 */
export function segmentsOf(text: string): Segment[] {
  const marks: Array<{ start: number; end: number; kind: Segment["kind"] }> = [];
  for (const [re, kind] of [
    [EMAIL, "email"],
    [PHONE, "phone"],
  ] as const) {
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (!marks.some((x) => start < x.end && end > x.start)) marks.push({ start, end, kind });
    }
  }
  marks.sort((a, b) => a.start - b.start);
  const out: Segment[] = [];
  let at = 0;
  for (const x of marks) {
    if (x.start > at) out.push({ kind: "text", text: text.slice(at, x.start) });
    out.push({ kind: x.kind, text: text.slice(x.start, x.end) });
    at = x.end;
  }
  if (at < text.length) out.push({ kind: "text", text: text.slice(at) });
  return out;
}

/**
 * 묶음 하나의 값 → 화면 조각. null 이면 숨긴다.
 * 아는 값 이름이 하나라도 있는데 모두 비었으면 숨김. 일부만 비었으면 남는 ' / ' 를 정리한다.
 * 모르는 값 이름({오타})은 그대로 보인다 — 관리자가 미리보기에서 알아챌 수 있게.
 * kinds 에 있는 값 이름(문의메일 등)은 값 전체가 한 조각(메일 링크/전화번호), 나머지 글은 segmentsOf 로 찾는다.
 */
export function renderSegments(value: string, tokens: TokenValues, kinds: TokenKinds = {}): Segment[] | null {
  let known = 0;
  let empty = 0;
  const held: Segment[] = [];
  const out = value.replace(HOLD_CHARS, "").replace(TOKEN, (whole, name: string) => {
    if (!Object.hasOwn(tokens, name)) return whole;
    known++;
    const v = tokens[name]?.trim() ?? "";
    if (!v) {
      empty++;
      return "";
    }
    const kind = Object.hasOwn(kinds, name) ? kinds[name] : undefined;
    if (!kind) return v;
    held.push({ kind, text: v });
    return `\uE000${held.length - 1}\uE001`;
  });
  if (known > 0 && empty === known) return null;
  let text = out.replace(/\s+/g, " ").trim();
  if (empty > 0)
    text = text
      .split(SLASH)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" / ");
  if (!text) return null;
  const segments: Segment[] = [];
  let at = 0;
  for (const m of text.matchAll(HOLD)) {
    const start = m.index ?? 0;
    if (start > at) segments.push(...segmentsOf(text.slice(at, start)));
    segments.push(held[Number(m[1])]);
    at = start + m[0].length;
  }
  if (at < text.length) segments.push(...segmentsOf(text.slice(at)));
  return segments;
}

/** 묶음 하나의 값 → 화면 글 (조각을 이어 붙인 것). null 이면 숨긴다 */
export function renderValue(value: string, tokens: TokenValues): string | null {
  const segments = renderSegments(value, tokens);
  return segments ? segments.map((s) => s.text).join("") : null;
}

/** 저장된 글 → 화면에 그릴 줄들 (숨길 묶음·빈 줄 제외) */
export function renderMarkup(src: string, tokens: TokenValues, kinds: TokenKinds = {}): RenderedGroup[][] {
  return parseMarkup(src)
    .map((groups) =>
      groups.flatMap((g) => {
        const segments = renderSegments(g.value, tokens, kinds);
        return segments === null ? [] : [{ label: g.label, segments }];
      }),
    )
    .filter((line) => line.length > 0);
}

/** 이름표 없이 한 줄 글만 (저작권 문구 등) */
export function renderPlain(src: string, tokens: TokenValues): string {
  return renderValue(src, tokens) ?? "";
}
