// 토큰 ↔ 피그마 변수 값 바꾸기 — 순수 함수 (테스트: tests/figma-plugin.test.ts). docs/FIGMA_SYNC.md 약속 A.
// 이름 규칙/색 표기/비교는 scripts/figma/tokens.ts 를 같이 쓴다 (코드와 플러그인이 같은 규칙).
import {
  COLLECTION_BY_GROUP,
  figmaVariableToPath,
  flattenTokens,
  formatColor,
  parseColor,
  splitPath,
  unflattenTokens,
  type FlatToken,
  type TokensFile,
} from "../../scripts/figma/tokens.ts";

export type FigmaRgba = { r: number; g: number; b: number; a: number };
export type FigmaVarType = "COLOR" | "FLOAT" | "STRING";
export type FigmaValue = FigmaRgba | number | string;

/** 피그마 색(0~1) → CSS 표기 */
export function figmaColorToCss(c: FigmaRgba): string {
  return formatColor({ r: c.r * 255, g: c.g * 255, b: c.b * 255, a: c.a });
}

/** CSS 색 → 피그마 색(0~1) */
export function cssToFigmaColor(value: string): FigmaRgba {
  const c = parseColor(value);
  return { r: c.r / 255, g: c.g / 255, b: c.b / 255, a: c.a };
}

/** 피그마에 만들 변수 하나 */
export type VariableSpec = { collection: string; name: string; type: FigmaVarType; desktop: FigmaValue; mobile?: FigmaValue };

function toFigmaValue(t: FlatToken, v: string | string[]): FigmaValue {
  if (t.type === "color") return cssToFigmaColor(String(v));
  if (t.type === "fontFamily") return Array.isArray(v) ? v[0] : String(v);
  return parseFloat(String(v));
}

/** tokens.json → 만들 변수 목록. 변수 이름 = 토큰 경로('color/blue'), 컬렉션 = 그룹(Color/Radius/Layout/Font) */
export function tokensToVariableSpecs(tokens: TokensFile): VariableSpec[] {
  return flattenTokens(tokens).map((t) => {
    const [group] = splitPath(t.path);
    const spec: VariableSpec = {
      collection: COLLECTION_BY_GROUP[group],
      name: t.path,
      type: t.type === "color" ? "COLOR" : t.type === "fontFamily" ? "STRING" : "FLOAT",
      desktop: toFigmaValue(t, t.value),
    };
    if (t.mobile !== undefined) spec.mobile = toFigmaValue(t, t.mobile);
    return spec;
  });
}

/** 피그마에서 읽은 변수 하나 (별칭은 code.ts 가 실제 값으로 풀어서 넘긴다) */
export type VariableRecord = { collection: string; name: string; type: FigmaVarType | "BOOLEAN"; desktop: FigmaValue | boolean; mobile?: FigmaValue | boolean };

const isRgba = (v: unknown): v is FigmaRgba => typeof v === "object" && v !== null && "r" in v;

function fromFigmaValue(type: FigmaVarType, group: string, v: FigmaValue): string | string[] {
  if (type === "COLOR" && isRgba(v)) return figmaColorToCss(v);
  if (type === "FLOAT" && typeof v === "number") return `${Math.round(v * 100) / 100}px`;
  if (type === "STRING" && group === "font") return [String(v)];
  return String(v);
}

/**
 * 피그마 변수 → tokens.json 모양 ('토큰 내보내기'). 아는 컬렉션(Color/Space/Radius/Layout/Font)만, BOOLEAN 은 뺀다.
 * 휴대폰 값은 기본 값과 다를 때만 $extensions.mobile.
 */
export function variablesToTokens(records: VariableRecord[]): { tokens: TokensFile; skipped: string[] } {
  const flat: FlatToken[] = [];
  const skipped: string[] = [];
  for (const r of records) {
    const path = figmaVariableToPath(r.collection, r.name);
    if (!path) continue;
    if (r.type === "BOOLEAN" || typeof r.desktop === "boolean" || typeof r.mobile === "boolean") {
      skipped.push(`${r.collection}/${r.name}: 참/거짓 변수는 토큰이 아닙니다`);
      continue;
    }
    const [group] = splitPath(path);
    const type = r.type === "COLOR" ? "color" : r.type === "FLOAT" ? "dimension" : group === "font" ? "fontFamily" : null;
    if (!type) {
      skipped.push(`${r.collection}/${r.name}: 글자 변수는 Font 컬렉션에만 씁니다`);
      continue;
    }
    const value = fromFigmaValue(r.type, group, r.desktop);
    const t: FlatToken = { path, type, value };
    if (r.mobile !== undefined) {
      const m = fromFigmaValue(r.type, group, r.mobile);
      if (JSON.stringify(m) !== JSON.stringify(value)) t.mobile = m;
    }
    flat.push(t);
  }
  return { tokens: unflattenTokens(flat, "피그마 변수에서 내보낸 토큰 (플러그인 '토큰 내보내기'). design/tokens.json 과 비교: npm run figma:check <이 파일>"), skipped };
}

/** 두 피그마 값이 같은지 (색은 표기로 비교 — 소수점 오차 무시) */
export function sameFigmaValue(type: FigmaVarType, a: unknown, b: unknown): boolean {
  if (type === "COLOR") return isRgba(a) && isRgba(b) && figmaColorToCss(a) === figmaColorToCss(b);
  if (type === "FLOAT") return typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 0.005;
  return a === b;
}
