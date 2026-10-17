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
  return s.replace(/\*{2,}/g, "*").replace(/\s+/g, " ").trim();
}

/** 묶음들 → 저장할 글 (parseMarkup 의 반대) */
export function serializeMarkup(lines: MarkupGroup[][]): string {
  return lines
    .map((groups) =>
      groups
        .map((g) => {
          const label = cleanLabel(g.label);
          const value = cleanValue(g.value);
          if (!label) return value;
          return value ? `**${label}** ${value}` : `**${label}**`;
        })
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join("\n");
}

/** {값 이름} — 화면에 보일 때 실제 값으로 바뀐다 */
export const TOKEN = /\{([^{}\s]+)\}/g;

export type TokenValues = Readonly<Record<string, string | null | undefined>>;

export type Segment = { kind: "text" | "email" | "phone"; text: string };
export type RenderedGroup = { label: string; segments: Segment[] };

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /0\d{1,2}-\d{3,4}-\d{4}/g;
/** 띄어쓴 '/' 하나 (주소의 'https://'·'1/2' 는 아님) */
const SLASH = /(?<=^|\s)\/(?=\s|$)/;

/** 값 글 → 글/이메일(메일 링크)/전화번호(줄바꿈 안 함) 조각 */
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
 * 묶음 하나의 값 → 화면 글. null 이면 숨긴다.
 * 아는 값 이름이 하나라도 있는데 모두 비었으면 숨김. 일부만 비었으면 남는 ' / ' 를 정리한다.
 * 모르는 값 이름({오타})은 그대로 보인다 — 관리자가 미리보기에서 알아챌 수 있게.
 */
export function renderValue(value: string, tokens: TokenValues): string | null {
  let known = 0;
  let empty = 0;
  const out = value.replace(TOKEN, (whole, name: string) => {
    if (!Object.hasOwn(tokens, name)) return whole;
    known++;
    const v = tokens[name]?.trim() ?? "";
    if (!v) empty++;
    return v;
  });
  if (known > 0 && empty === known) return null;
  let text = out.replace(/\s+/g, " ").trim();
  if (empty > 0)
    text = text
      .split(SLASH)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" / ");
  return text || null;
}

/** 저장된 글 → 화면에 그릴 줄들 (숨길 묶음·빈 줄 제외) */
export function renderMarkup(src: string, tokens: TokenValues): RenderedGroup[][] {
  return parseMarkup(src)
    .map((groups) =>
      groups.flatMap((g) => {
        const text = renderValue(g.value, tokens);
        return text === null ? [] : [{ label: g.label, segments: segmentsOf(text) }];
      }),
    )
    .filter((line) => line.length > 0);
}

/** 이름표 없이 한 줄 글만 (저작권 문구 등) */
export function renderPlain(src: string, tokens: TokenValues): string {
  return renderValue(src, tokens) ?? "";
}
