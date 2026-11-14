// 디자인 토큰 변환 — src/styles/tokens.css(코드가 기준) ↔ design/tokens.json(W3C Design Tokens) ↔ 피그마 변수 (D-066, docs/FIGMA_SYNC.md 약속 A).
// 순수 함수만 둔다: Node 스크립트(build-tokens.ts, check-figma.ts)·테스트·피그마 플러그인(code.ts)이 같이 쓴다.
// 그래서 node: 모듈이나 @/ 별칭을 import 하지 않는다.

/** tokens.json 그룹 — 이 순서로 쓴다 */
export const TOKEN_GROUPS = ["color", "space", "radius", "layout", "font"] as const;
export type TokenGroup = (typeof TOKEN_GROUPS)[number];

export type TokenType = "color" | "dimension" | "fontFamily";

/** W3C 토큰 하나. 휴대폰(720px 이하) 값이 다르면 $extensions.mobile */
export type DesignToken = {
  $type: TokenType;
  $value: string | string[];
  $extensions?: { mobile: string | string[] };
};

export type TokensFile = {
  $description?: string;
} & Partial<Record<TokenGroup, Record<string, DesignToken>>>;

/** 한 줄로 편 토큰 — 경로 'color/blue' 를 열쇠로 비교한다 */
export type FlatToken = { path: string; type: TokenType; value: string | string[]; mobile?: string | string[] };

/** 반응형 기준 — tokens.css 의 @media (max-width: 720px) */
export const MOBILE_MAX_WIDTH = 720;

/** next/font 가 넣는 글꼴 변수 → 글꼴 파일 안의 실제 글꼴 이름 (src/fonts/KFAGothic-*.woff2 의 family — 피그마에 설치하면 이 이름으로 보인다) */
const FONT_VAR_NAMES: Record<string, string> = { "--font-kfa": "KFAGothic TTF" };

// ── tokens.css 읽기 ─────────────────────────────

/** 블록 안의 `--이름: 값;` 들 (주석 제거 후) */
function declarations(block: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+?)\s*(?:;|$)/gi; // 블록 마지막 선언은 세미콜론이 없어도 된다
  for (let m = re.exec(block); m; m = re.exec(block)) out.push([m[1], m[2].trim()]);
  return out;
}

/** 여는 중괄호 위치부터 짝이 맞는 닫는 중괄호까지의 안쪽 */
function braceBody(css: string, open: number): string {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  throw new Error("tokens.css: 중괄호 짝이 맞지 않습니다");
}

/**
 * tokens.css → 기본(:root) 값과 휴대폰(@media max-width 720px 안 :root) 값.
 * 다른 미디어 쿼리나 :root 밖 선언은 토큰이 아니라서 읽지 않는다.
 */
export function parseTokensCss(css: string): { base: Map<string, string>; mobile: Map<string, string> } {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const base = new Map<string, string>();
  const mobile = new Map<string, string>();
  let i = 0;
  while (i < clean.length) {
    const media = clean.indexOf("@media", i);
    const root = clean.indexOf(":root", i);
    if (root < 0 && media < 0) break;
    if (media >= 0 && (root < 0 || media < root)) {
      const open = clean.indexOf("{", media);
      const query = clean.slice(media, open);
      const body = braceBody(clean, open);
      if (new RegExp(`max-width:\\s*${MOBILE_MAX_WIDTH}px`).test(query)) {
        const r = body.indexOf(":root");
        if (r >= 0) for (const [k, v] of declarations(braceBody(body, body.indexOf("{", r)))) mobile.set(k, v);
      }
      i = open + body.length + 2;
    } else {
      const open = clean.indexOf("{", root);
      const body = braceBody(clean, open);
      for (const [k, v] of declarations(body)) base.set(k, v);
      i = open + body.length + 2;
    }
  }
  return { base, mobile };
}

// ── 이름 규칙 (약속 A) ──────────────────────────

/**
 * CSS 변수 이름 → 토큰 경로.
 * --c-blue → color/blue, --radius-s → radius/s, --space-x → space/x, --font → font/family, 나머지(--gutter 등) → layout/gutter
 */
export function cssVarToPath(name: string): string {
  const n = name.replace(/^--/, "");
  if (n.startsWith("c-")) return `color/${n.slice(2)}`;
  if (n.startsWith("radius-")) return `radius/${n.slice(7)}`;
  if (n.startsWith("space-")) return `space/${n.slice(6)}`;
  if (n === "font") return "font/family";
  if (n.startsWith("font-")) return `font/${n.slice(5)}`;
  return `layout/${n}`;
}

/** 토큰 경로 → CSS 변수 이름 (cssVarToPath 의 반대) */
export function pathToCssVar(path: string): string {
  const [group, name] = splitPath(path);
  if (group === "color") return `--c-${name}`;
  if (group === "radius") return `--radius-${name}`;
  if (group === "space") return `--space-${name}`;
  if (group === "font") return name === "family" ? "--font" : `--font-${name}`;
  return `--${name}`;
}

export function splitPath(path: string): [TokenGroup, string] {
  const slash = path.indexOf("/");
  const group = path.slice(0, slash) as TokenGroup;
  if (slash < 0 || !TOKEN_GROUPS.includes(group)) throw new Error(`알 수 없는 토큰 경로: ${path}`);
  return [group, path.slice(slash + 1)];
}

// ── 값 ──────────────────────────────────────────

/** 'font-family' 목록 → 글꼴 이름 배열 (따옴표 제거, var(--font-kfa) 는 실제 글꼴 이름으로) */
export function parseFontFamily(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const v = /^var\((--[a-z0-9-]+)\)$/i.exec(s);
      if (v) {
        const named = FONT_VAR_NAMES[v[1]];
        if (!named) throw new Error(`글꼴 변수 ${v[1]} 의 실제 이름을 FONT_VAR_NAMES 에 적어 주세요`);
        return named;
      }
      return s.replace(/^["']|["']$/g, "");
    });
}

function tokenType(path: string, value: string): TokenType {
  if (path.startsWith("font/")) return "fontFamily";
  if (path.startsWith("color/")) return "color";
  if (/^-?\d+(\.\d+)?px$/.test(value)) return "dimension";
  throw new Error(`${path}: 토큰으로 옮길 수 없는 값 '${value}' (색, px, 글꼴만)`);
}

function tokenValue(type: TokenType, value: string): string | string[] {
  if (type === "fontFamily") return parseFontFamily(value);
  if (type === "color") return formatColor(parseColor(value));
  return value;
}

// ── 색 ──────────────────────────────────────────

export type Rgba = { r: number; g: number; b: number; a: number };

/** '#1a349a' / '#fff' / '#1a349aa3' / 'rgba(255, 255, 255, 0.64)' / 'rgb(…)' → 0~255 정수 + 알파 0~1 */
export function parseColor(value: string): Rgba {
  const v = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? round2(n(6) / 255) : 1 };
  }
  const fn = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
  if (fn) return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a: fn[4] === undefined ? 1 : Number(fn[4]) };
  throw new Error(`색으로 읽을 수 없는 값: ${value}`);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/** 불투명 → '#rrggbb', 반투명 → 'rgba(r, g, b, a)' (tokens.css 표기와 같게, 알파는 소수 둘째 자리) */
export function formatColor(c: Rgba): string {
  if (c.a >= 1) return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${round2(c.a)})`;
}

// ── tokens.css → tokens.json ────────────────────

export const TOKENS_DESCRIPTION =
  "서울은평 덴포스 디자인 토큰. src/styles/tokens.css 에서 자동 생성 (scripts/figma/build-tokens.ts) — 직접 고치지 말 것. 휴대폰(720px 이하) 값은 $extensions.mobile";

/** tokens.css 내용 → tokens.json 객체 (그룹 순서 TOKEN_GROUPS, 그룹 안은 tokens.css 순서) */
export function buildTokens(css: string): TokensFile {
  const { base, mobile } = parseTokensCss(css);
  for (const k of mobile.keys()) if (!base.has(k)) throw new Error(`${k}: 휴대폰 값만 있고 기본 값이 없습니다`);
  const out: TokensFile = { $description: TOKENS_DESCRIPTION };
  const groups = new Map<TokenGroup, Record<string, DesignToken>>();
  for (const [name, raw] of base) {
    const path = cssVarToPath(name);
    const [group, key] = splitPath(path);
    const type = tokenType(path, raw);
    const token: DesignToken = { $type: type, $value: tokenValue(type, raw) };
    const m = mobile.get(name);
    if (m !== undefined && m !== raw) token.$extensions = { mobile: tokenValue(type, m) };
    if (!groups.has(group)) groups.set(group, {});
    groups.get(group)![key] = token;
  }
  for (const g of TOKEN_GROUPS) if (groups.has(g)) out[g] = groups.get(g);
  return out;
}

/** 파일로 쓸 문자열 (2칸 들여쓰기 + 끝 줄바꿈) — 생성물이 늘 같은 글자가 되게 */
export function stringifyTokens(tokens: TokensFile): string {
  return `${JSON.stringify(tokens, null, 2)}\n`;
}

// ── 펴기 / 접기 / 비교 ──────────────────────────

const isToken = (v: unknown): v is DesignToken => typeof v === "object" && v !== null && "$value" in v;

/** tokens.json → 한 줄 목록. 그룹 안에 하위 그룹이 있으면 'color/brand/blue' 처럼 경로를 잇는다 */
export function flattenTokens(tokens: TokensFile): FlatToken[] {
  const out: FlatToken[] = [];
  const walk = (node: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("$")) continue;
      const path = `${prefix}/${k}`;
      if (isToken(v)) {
        const t: FlatToken = { path, type: v.$type, value: v.$value };
        if (v.$extensions?.mobile !== undefined) t.mobile = v.$extensions.mobile;
        out.push(t);
      } else if (typeof v === "object" && v !== null) walk(v as Record<string, unknown>, path);
    }
  };
  for (const g of TOKEN_GROUPS) {
    const group = tokens[g];
    if (group) walk(group as Record<string, unknown>, g);
  }
  return out;
}

/** 한 줄 목록 → tokens.json 모양 (피그마 '토큰 내보내기'가 이걸로 만든다) */
export function unflattenTokens(flat: FlatToken[], description = TOKENS_DESCRIPTION): TokensFile {
  const out: TokensFile = { $description: description };
  const sorted = [...flat].sort((a, b) => TOKEN_GROUPS.indexOf(splitPath(a.path)[0]) - TOKEN_GROUPS.indexOf(splitPath(b.path)[0]));
  for (const t of sorted) {
    const [group, rest] = splitPath(t.path);
    const parts = rest.split("/");
    const root = (out[group] ??= {}) as Record<string, unknown>;
    let node = root;
    for (const p of parts.slice(0, -1)) node = (node[p] ??= {}) as Record<string, unknown>;
    const token: DesignToken = { $type: t.type, $value: t.value };
    if (t.mobile !== undefined) token.$extensions = { mobile: t.mobile };
    node[parts[parts.length - 1]] = token;
  }
  return out;
}

/**
 * 비교용으로 값 맞추기 — 색은 #rrggbb/rgba 로(대소문자·표기 차이 무시), 크기는 '숫자px',
 * 글꼴은 첫 번째 글꼴만 (피그마 변수에는 대체 글꼴 목록을 담을 수 없다).
 */
export function normalizeValue(type: TokenType, value: string | string[] | number): string {
  if (type === "fontFamily") return (Array.isArray(value) ? value[0] : String(value).split(",")[0]).trim().replace(/^["']|["']$/g, "");
  if (type === "color") return formatColor(parseColor(String(value)));
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return `${round2(n)}px`;
}

export type TokenDiff =
  | { kind: "missing"; path: string; expected: string }
  | { kind: "extra"; path: string; actual: string }
  | { kind: "type"; path: string; expected: TokenType; actual: TokenType }
  | { kind: "value"; path: string; mode: "desktop" | "mobile"; expected: string; actual: string };

/**
 * 기준(expected = tokens.json)과 비교 대상(actual = 피그마에서 내보낸 JSON)의 차이.
 * 휴대폰 값이 없으면 기본 값과 같다고 본다 (피그마 Mobile 모드에 같은 값을 넣어도 차이 아님).
 */
export function diffTokens(expected: TokensFile, actual: TokensFile): TokenDiff[] {
  const exp = new Map(flattenTokens(expected).map((t) => [t.path, t]));
  const act = new Map(flattenTokens(actual).map((t) => [t.path, t]));
  const out: TokenDiff[] = [];
  for (const [path, e] of exp) {
    const a = act.get(path);
    if (!a) {
      out.push({ kind: "missing", path, expected: normalizeValue(e.type, e.value) });
      continue;
    }
    // 피그마는 크기·글꼴을 숫자/문자 변수로 담는다 — 종류가 달라도 값으로 비교할 수 있으면 값만 본다
    if (e.type !== a.type && (e.type === "color" || a.type === "color")) {
      out.push({ kind: "type", path, expected: e.type, actual: a.type });
      continue;
    }
    const ed = normalizeValue(e.type, e.value);
    const ad = normalizeValue(e.type, a.value);
    if (ed !== ad) out.push({ kind: "value", path, mode: "desktop", expected: ed, actual: ad });
    const em = normalizeValue(e.type, e.mobile ?? e.value);
    const am = normalizeValue(e.type, a.mobile ?? a.value);
    if (em !== am) out.push({ kind: "value", path, mode: "mobile", expected: em, actual: am });
  }
  for (const [path, a] of act) if (!exp.has(path)) out.push({ kind: "extra", path, actual: normalizeValue(a.type, a.value) });
  return out;
}

/** 차이 한 줄 설명 (스크립트·테스트 실패 메시지) */
export function describeDiff(d: TokenDiff): string {
  if (d.kind === "missing") return `${d.path}: 피그마에 없음 (코드 값 ${d.expected})`;
  if (d.kind === "extra") return `${d.path}: 코드(tokens.css)에 없는 피그마 변수 (${d.actual})`;
  if (d.kind === "type") return `${d.path}: 종류가 다름 (코드 ${d.expected}, 피그마 ${d.actual})`;
  return `${d.path} [${d.mode === "desktop" ? "Desktop" : "Mobile"}]: 코드 ${d.expected}, 피그마 ${d.actual}`;
}

// ── 피그마 변수 이름 (플러그인) ─────────────────

/** 그룹 → 피그마 변수 컬렉션 이름 (FIGMA_SYNC.md '01 Foundations') */
export const COLLECTION_BY_GROUP: Record<TokenGroup, string> = {
  color: "Color",
  space: "Space",
  radius: "Radius",
  layout: "Layout",
  font: "Font",
};

export const MODE_DESKTOP = "Desktop";
export const MODE_MOBILE = "Mobile";

/**
 * 피그마 변수(컬렉션 이름 + 변수 이름) → 토큰 경로.
 * 약속: 변수 이름 = 토큰 경로 그대로('color/blue'). 컬렉션 안에서 앞부분을 뺀 이름('blue')도 받아 준다.
 * 아는 컬렉션이 아니면 null (다른 용도 변수는 건너뛴다).
 */
export function figmaVariableToPath(collection: string, variable: string): string | null {
  const entry = (Object.entries(COLLECTION_BY_GROUP) as Array<[TokenGroup, string]>).find(([, c]) => c.toLowerCase() === collection.trim().toLowerCase());
  if (!entry) return null;
  const [group] = entry;
  const name = variable.trim();
  return name.startsWith(`${group}/`) ? name : `${group}/${name}`;
}
