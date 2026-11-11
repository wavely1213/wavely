// 자동 생성 — 직접 고치지 말 것. 원본 figma-plugin/src, 빌드: npm run figma:plugin (D-066)
/* eslint-disable */
(function () {
"use strict";
var BUNDLED_TOKENS = {"$description":"서울은평 덴포스 디자인 토큰. src/styles/tokens.css 에서 자동 생성 (scripts/figma/build-tokens.ts) — 직접 고치지 말 것. 휴대폰(720px 이하) 값은 $extensions.mobile","color":{"blue":{"$type":"color","$value":"#1a349a"},"blue-hover":{"$type":"color","$value":"#142a7e"},"blue-tint":{"$type":"color","$value":"#eef1fa"},"black":{"$type":"color","$value":"#0e0f12"},"black-soft":{"$type":"color","$value":"#1c1e24"},"yellow":{"$type":"color","$value":"#ffc000"},"bg":{"$type":"color","$value":"#ffffff"},"bg-soft":{"$type":"color","$value":"#f5f6f8"},"text":{"$type":"color","$value":"#0e0f12"},"text-sub":{"$type":"color","$value":"#6b7080"},"line":{"$type":"color","$value":"#e6e8ec"},"on-dark":{"$type":"color","$value":"#ffffff"},"on-dark-sub":{"$type":"color","$value":"rgba(255, 255, 255, 0.64)"},"line-on-dark":{"$type":"color","$value":"rgba(255, 255, 255, 0.12)"},"win":{"$type":"color","$value":"#17a34a"},"draw":{"$type":"color","$value":"#8a8f9c"},"draw-tint":{"$type":"color","$value":"#eef0f3"},"loss":{"$type":"color","$value":"#d63b3b"},"loss-tint":{"$type":"color","$value":"#fdeded"},"on-blue":{"$type":"color","$value":"#ffffff"},"overlay-strong":{"$type":"color","$value":"rgba(14, 15, 18, 0.9)"},"overlay-mid":{"$type":"color","$value":"rgba(14, 15, 18, 0.55)"},"overlay-weak":{"$type":"color","$value":"rgba(14, 15, 18, 0.35)"},"overlay-faint":{"$type":"color","$value":"rgba(14, 15, 18, 0.15)"}},"space":{"2xs":{"$type":"dimension","$value":"4px"},"xs":{"$type":"dimension","$value":"8px"},"s":{"$type":"dimension","$value":"12px"},"m":{"$type":"dimension","$value":"16px"},"ml":{"$type":"dimension","$value":"20px"},"l":{"$type":"dimension","$value":"24px"},"xl":{"$type":"dimension","$value":"32px"},"2xl":{"$type":"dimension","$value":"48px"},"3xl":{"$type":"dimension","$value":"64px"}},"radius":{"s":{"$type":"dimension","$value":"6px"},"m":{"$type":"dimension","$value":"10px"},"l":{"$type":"dimension","$value":"16px"},"pill":{"$type":"dimension","$value":"999px"}},"layout":{"container":{"$type":"dimension","$value":"1200px"},"gutter":{"$type":"dimension","$value":"20px","$extensions":{"mobile":"16px"}},"header-h":{"$type":"dimension","$value":"80px","$extensions":{"mobile":"60px"}},"section-gap":{"$type":"dimension","$value":"72px","$extensions":{"mobile":"48px"}},"topbar-h":{"$type":"dimension","$value":"44px","$extensions":{"mobile":"0px"}},"hero-h":{"$type":"dimension","$value":"640px","$extensions":{"mobile":"520px"}},"aside-w":{"$type":"dimension","$value":"280px"},"match-hero-w":{"$type":"dimension","$value":"456px","$extensions":{"mobile":"358px"}}},"font":{"family":{"$type":"fontFamily","$value":["KFAGothic TTF","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic","system-ui","sans-serif"]}}};
var __modules = {
  "scripts/figma/tokens.ts": function (module, exports, __require) {
"use strict";
// 디자인 토큰 변환 — src/styles/tokens.css(코드가 기준) ↔ design/tokens.json(W3C Design Tokens) ↔ 피그마 변수 (D-066, docs/FIGMA_SYNC.md 약속 A).
// 순수 함수만 둔다: Node 스크립트(build-tokens.ts, check-figma.ts)·테스트·피그마 플러그인(code.ts)이 같이 쓴다.
// 그래서 node: 모듈이나 @/ 별칭을 import 하지 않는다.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODE_MOBILE = exports.MODE_DESKTOP = exports.COLLECTION_BY_GROUP = exports.TOKENS_DESCRIPTION = exports.MOBILE_MAX_WIDTH = exports.TOKEN_GROUPS = void 0;
exports.parseTokensCss = parseTokensCss;
exports.cssVarToPath = cssVarToPath;
exports.pathToCssVar = pathToCssVar;
exports.splitPath = splitPath;
exports.parseFontFamily = parseFontFamily;
exports.parseColor = parseColor;
exports.formatColor = formatColor;
exports.buildTokens = buildTokens;
exports.stringifyTokens = stringifyTokens;
exports.flattenTokens = flattenTokens;
exports.unflattenTokens = unflattenTokens;
exports.normalizeValue = normalizeValue;
exports.diffTokens = diffTokens;
exports.describeDiff = describeDiff;
exports.figmaVariableToPath = figmaVariableToPath;
/** tokens.json 그룹 — 이 순서로 쓴다 */
exports.TOKEN_GROUPS = ["color", "space", "radius", "layout", "font"];
/** 반응형 기준 — tokens.css 의 @media (max-width: 720px) */
exports.MOBILE_MAX_WIDTH = 720;
/** next/font 가 넣는 글꼴 변수 → 글꼴 파일 안의 실제 글꼴 이름 (src/fonts/KFAGothic-*.woff2 의 family — 피그마에 설치하면 이 이름으로 보인다) */
const FONT_VAR_NAMES = { "--font-kfa": "KFAGothic TTF" };
// ── tokens.css 읽기 ─────────────────────────────
/** 블록 안의 `--이름: 값;` 들 (주석 제거 후) */
function declarations(block) {
    const out = [];
    const re = /(--[a-z0-9-]+)\s*:\s*([^;]+?)\s*(?:;|$)/gi; // 블록 마지막 선언은 세미콜론이 없어도 된다
    for (let m = re.exec(block); m; m = re.exec(block))
        out.push([m[1], m[2].trim()]);
    return out;
}
/** 여는 중괄호 위치부터 짝이 맞는 닫는 중괄호까지의 안쪽 */
function braceBody(css, open) {
    let depth = 0;
    for (let i = open; i < css.length; i++) {
        if (css[i] === "{")
            depth++;
        else if (css[i] === "}" && --depth === 0)
            return css.slice(open + 1, i);
    }
    throw new Error("tokens.css: 중괄호 짝이 맞지 않습니다");
}
/**
 * tokens.css → 기본(:root) 값과 휴대폰(@media max-width 720px 안 :root) 값.
 * 다른 미디어 쿼리나 :root 밖 선언은 토큰이 아니라서 읽지 않는다.
 */
function parseTokensCss(css) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const base = new Map();
    const mobile = new Map();
    let i = 0;
    while (i < clean.length) {
        const media = clean.indexOf("@media", i);
        const root = clean.indexOf(":root", i);
        if (root < 0 && media < 0)
            break;
        if (media >= 0 && (root < 0 || media < root)) {
            const open = clean.indexOf("{", media);
            const query = clean.slice(media, open);
            const body = braceBody(clean, open);
            if (new RegExp(`max-width:\\s*${exports.MOBILE_MAX_WIDTH}px`).test(query)) {
                const r = body.indexOf(":root");
                if (r >= 0)
                    for (const [k, v] of declarations(braceBody(body, body.indexOf("{", r))))
                        mobile.set(k, v);
            }
            i = open + body.length + 2;
        }
        else {
            const open = clean.indexOf("{", root);
            const body = braceBody(clean, open);
            for (const [k, v] of declarations(body))
                base.set(k, v);
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
function cssVarToPath(name) {
    const n = name.replace(/^--/, "");
    if (n.startsWith("c-"))
        return `color/${n.slice(2)}`;
    if (n.startsWith("radius-"))
        return `radius/${n.slice(7)}`;
    if (n.startsWith("space-"))
        return `space/${n.slice(6)}`;
    if (n === "font")
        return "font/family";
    if (n.startsWith("font-"))
        return `font/${n.slice(5)}`;
    return `layout/${n}`;
}
/** 토큰 경로 → CSS 변수 이름 (cssVarToPath 의 반대) */
function pathToCssVar(path) {
    const [group, name] = splitPath(path);
    if (group === "color")
        return `--c-${name}`;
    if (group === "radius")
        return `--radius-${name}`;
    if (group === "space")
        return `--space-${name}`;
    if (group === "font")
        return name === "family" ? "--font" : `--font-${name}`;
    return `--${name}`;
}
function splitPath(path) {
    const slash = path.indexOf("/");
    const group = path.slice(0, slash);
    if (slash < 0 || !exports.TOKEN_GROUPS.includes(group))
        throw new Error(`알 수 없는 토큰 경로: ${path}`);
    return [group, path.slice(slash + 1)];
}
// ── 값 ──────────────────────────────────────────
/** 'font-family' 목록 → 글꼴 이름 배열 (따옴표 제거, var(--font-kfa) 는 실제 글꼴 이름으로) */
function parseFontFamily(value) {
    return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
        const v = /^var\((--[a-z0-9-]+)\)$/i.exec(s);
        if (v) {
            const named = FONT_VAR_NAMES[v[1]];
            if (!named)
                throw new Error(`글꼴 변수 ${v[1]} 의 실제 이름을 FONT_VAR_NAMES 에 적어 주세요`);
            return named;
        }
        return s.replace(/^["']|["']$/g, "");
    });
}
function tokenType(path, value) {
    if (path.startsWith("font/"))
        return "fontFamily";
    if (path.startsWith("color/"))
        return "color";
    if (/^-?\d+(\.\d+)?px$/.test(value))
        return "dimension";
    throw new Error(`${path}: 토큰으로 옮길 수 없는 값 '${value}' (색, px, 글꼴만)`);
}
function tokenValue(type, value) {
    if (type === "fontFamily")
        return parseFontFamily(value);
    if (type === "color")
        return formatColor(parseColor(value));
    return value;
}
/** '#1a349a' / '#fff' / '#1a349aa3' / 'rgba(255, 255, 255, 0.64)' / 'rgb(…)' → 0~255 정수 + 알파 0~1 */
function parseColor(value) {
    const v = value.trim().toLowerCase();
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
    if (hex) {
        let h = hex[1];
        if (h.length === 3)
            h = h.replace(/./g, (c) => c + c);
        const n = (i) => parseInt(h.slice(i, i + 2), 16);
        return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? round2(n(6) / 255) : 1 };
    }
    const fn = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
    if (fn)
        return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a: fn[4] === undefined ? 1 : Number(fn[4]) };
    throw new Error(`색으로 읽을 수 없는 값: ${value}`);
}
const round2 = (n) => Math.round(n * 100) / 100;
const hex2 = (n) => Math.round(n).toString(16).padStart(2, "0");
/** 불투명 → '#rrggbb', 반투명 → 'rgba(r, g, b, a)' (tokens.css 표기와 같게, 알파는 소수 둘째 자리) */
function formatColor(c) {
    if (c.a >= 1)
        return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
    return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${round2(c.a)})`;
}
// ── tokens.css → tokens.json ────────────────────
exports.TOKENS_DESCRIPTION = "서울은평 덴포스 디자인 토큰. src/styles/tokens.css 에서 자동 생성 (scripts/figma/build-tokens.ts) — 직접 고치지 말 것. 휴대폰(720px 이하) 값은 $extensions.mobile";
/** tokens.css 내용 → tokens.json 객체 (그룹 순서 TOKEN_GROUPS, 그룹 안은 tokens.css 순서) */
function buildTokens(css) {
    const { base, mobile } = parseTokensCss(css);
    for (const k of mobile.keys())
        if (!base.has(k))
            throw new Error(`${k}: 휴대폰 값만 있고 기본 값이 없습니다`);
    const out = { $description: exports.TOKENS_DESCRIPTION };
    const groups = new Map();
    for (const [name, raw] of base) {
        const path = cssVarToPath(name);
        const [group, key] = splitPath(path);
        const type = tokenType(path, raw);
        const token = { $type: type, $value: tokenValue(type, raw) };
        const m = mobile.get(name);
        if (m !== undefined && m !== raw)
            token.$extensions = { mobile: tokenValue(type, m) };
        if (!groups.has(group))
            groups.set(group, {});
        groups.get(group)[key] = token;
    }
    for (const g of exports.TOKEN_GROUPS)
        if (groups.has(g))
            out[g] = groups.get(g);
    return out;
}
/** 파일로 쓸 문자열 (2칸 들여쓰기 + 끝 줄바꿈) — 생성물이 늘 같은 글자가 되게 */
function stringifyTokens(tokens) {
    return `${JSON.stringify(tokens, null, 2)}\n`;
}
// ── 펴기 / 접기 / 비교 ──────────────────────────
const isToken = (v) => typeof v === "object" && v !== null && "$value" in v;
/** tokens.json → 한 줄 목록. 그룹 안에 하위 그룹이 있으면 'color/brand/blue' 처럼 경로를 잇는다 */
function flattenTokens(tokens) {
    const out = [];
    const walk = (node, prefix) => {
        var _a;
        for (const [k, v] of Object.entries(node)) {
            if (k.startsWith("$"))
                continue;
            const path = `${prefix}/${k}`;
            if (isToken(v)) {
                const t = { path, type: v.$type, value: v.$value };
                if (((_a = v.$extensions) === null || _a === void 0 ? void 0 : _a.mobile) !== undefined)
                    t.mobile = v.$extensions.mobile;
                out.push(t);
            }
            else if (typeof v === "object" && v !== null)
                walk(v, path);
        }
    };
    for (const g of exports.TOKEN_GROUPS) {
        const group = tokens[g];
        if (group)
            walk(group, g);
    }
    return out;
}
/** 한 줄 목록 → tokens.json 모양 (피그마 '토큰 내보내기'가 이걸로 만든다) */
function unflattenTokens(flat, description = exports.TOKENS_DESCRIPTION) {
    var _a, _b;
    const out = { $description: description };
    const sorted = [...flat].sort((a, b) => exports.TOKEN_GROUPS.indexOf(splitPath(a.path)[0]) - exports.TOKEN_GROUPS.indexOf(splitPath(b.path)[0]));
    for (const t of sorted) {
        const [group, rest] = splitPath(t.path);
        const parts = rest.split("/");
        const root = ((_a = out[group]) !== null && _a !== void 0 ? _a : (out[group] = {}));
        let node = root;
        for (const p of parts.slice(0, -1))
            node = ((_b = node[p]) !== null && _b !== void 0 ? _b : (node[p] = {}));
        const token = { $type: t.type, $value: t.value };
        if (t.mobile !== undefined)
            token.$extensions = { mobile: t.mobile };
        node[parts[parts.length - 1]] = token;
    }
    return out;
}
/**
 * 비교용으로 값 맞추기 — 색은 #rrggbb/rgba 로(대소문자·표기 차이 무시), 크기는 '숫자px',
 * 글꼴은 첫 번째 글꼴만 (피그마 변수에는 대체 글꼴 목록을 담을 수 없다).
 */
function normalizeValue(type, value) {
    if (type === "fontFamily")
        return (Array.isArray(value) ? value[0] : String(value).split(",")[0]).trim().replace(/^["']|["']$/g, "");
    if (type === "color")
        return formatColor(parseColor(String(value)));
    const n = typeof value === "number" ? value : parseFloat(String(value));
    return `${round2(n)}px`;
}
/**
 * 기준(expected = tokens.json)과 비교 대상(actual = 피그마에서 내보낸 JSON)의 차이.
 * 휴대폰 값이 없으면 기본 값과 같다고 본다 (피그마 Mobile 모드에 같은 값을 넣어도 차이 아님).
 */
function diffTokens(expected, actual) {
    var _a, _b;
    const exp = new Map(flattenTokens(expected).map((t) => [t.path, t]));
    const act = new Map(flattenTokens(actual).map((t) => [t.path, t]));
    const out = [];
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
        if (ed !== ad)
            out.push({ kind: "value", path, mode: "desktop", expected: ed, actual: ad });
        const em = normalizeValue(e.type, (_a = e.mobile) !== null && _a !== void 0 ? _a : e.value);
        const am = normalizeValue(e.type, (_b = a.mobile) !== null && _b !== void 0 ? _b : a.value);
        if (em !== am)
            out.push({ kind: "value", path, mode: "mobile", expected: em, actual: am });
    }
    for (const [path, a] of act)
        if (!exp.has(path))
            out.push({ kind: "extra", path, actual: normalizeValue(a.type, a.value) });
    return out;
}
/** 차이 한 줄 설명 (스크립트·테스트 실패 메시지) */
function describeDiff(d) {
    if (d.kind === "missing")
        return `${d.path}: 피그마에 없음 (코드 값 ${d.expected})`;
    if (d.kind === "extra")
        return `${d.path}: 코드(tokens.css)에 없는 피그마 변수 (${d.actual})`;
    if (d.kind === "type")
        return `${d.path}: 종류가 다름 (코드 ${d.expected}, 피그마 ${d.actual})`;
    return `${d.path} [${d.mode === "desktop" ? "Desktop" : "Mobile"}]: 코드 ${d.expected}, 피그마 ${d.actual}`;
}
// ── 피그마 변수 이름 (플러그인) ─────────────────
/** 그룹 → 피그마 변수 컬렉션 이름 (FIGMA_SYNC.md '01 Foundations') */
exports.COLLECTION_BY_GROUP = {
    color: "Color",
    space: "Space",
    radius: "Radius",
    layout: "Layout",
    font: "Font",
};
exports.MODE_DESKTOP = "Desktop";
exports.MODE_MOBILE = "Mobile";
/**
 * 피그마 변수(컬렉션 이름 + 변수 이름) → 토큰 경로.
 * 약속: 변수 이름 = 토큰 경로 그대로('color/blue'). 컬렉션 안에서 앞부분을 뺀 이름('blue')도 받아 준다.
 * 아는 컬렉션이 아니면 null (다른 용도 변수는 건너뛴다).
 */
function figmaVariableToPath(collection, variable) {
    const entry = Object.entries(exports.COLLECTION_BY_GROUP).find(([, c]) => c.toLowerCase() === collection.trim().toLowerCase());
    if (!entry)
        return null;
    const [group] = entry;
    const name = variable.trim();
    return name.startsWith(`${group}/`) ? name : `${group}/${name}`;
}

  },
  "figma-plugin/src/fonts.ts": function (module, exports, __require) {
"use strict";
// 'KFA 글꼴 적용' 규칙 — 순수 함수 (테스트: tests/figma-plugin.test.ts).
// 피그마 원격 작업(Claude 연결)에서는 KFA고딕을 쓸 수 없어 디자인 세션이 Noto Sans KR 로 임시 스타일을 만들었다.
// 소유자가 자기 컴퓨터에 KFA고딕을 설치하고 데스크톱에서 버튼을 누르면 Noto Sans KR 을 KFAGothic TTF 로 바꾼다 (소유자 결정 "기본적으로 KFA 폰트로").
// 글꼴 파일은 플러그인/저장소에 넣지 않는다 — KFA 라이선스상 제3자 배포 금지 (KNOWN_ISSUES I-007).
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOURCE_FAMILY = exports.KFA_STYLES = exports.KFA_FAMILY = void 0;
exports.styleWeight = styleWeight;
exports.kfaStyleFor = kfaStyleFor;
exports.swapToKfa = swapToKfa;
exports.missingKfaStyles = missingKfaStyles;
/** 사이트 글꼴 — src/fonts/KFAGothic-*.woff2 안의 이름 (design/tokens.json font/family 첫 글꼴) */
exports.KFA_FAMILY = "KFAGothic TTF";
exports.KFA_STYLES = ["Regular", "Bold"];
/** 바꿀 임시 글꼴 */
exports.SOURCE_FAMILY = "Noto Sans KR";
const WEIGHT_WORDS = [
    [/^(thin|hairline)$/, 100],
    [/^(extralight|ultralight)$/, 200],
    [/^light$/, 300],
    [/^(regular|normal|book|roman|)$/, 400],
    [/^medium$/, 500],
    [/^(semibold|demibold)$/, 600],
    [/^bold$/, 700],
    [/^(extrabold|ultrabold)$/, 800],
    [/^(black|heavy)$/, 900],
];
/** 스타일 이름 → 굵기 숫자 ('SemiBold' 600, 'Bold Italic' 700, '500' 500). 모르면 400 */
function styleWeight(style) {
    const s = style.toLowerCase().replace(/italic|oblique/g, "").replace(/[\s_-]/g, "");
    if (/^\d{3}$/.test(s))
        return Number(s);
    for (const [re, w] of WEIGHT_WORDS)
        if (re.test(s))
            return w;
    return 400;
}
/** Regular 와 Medium 이하는 Regular, SemiBold 이상은 Bold (KFA고딕은 두 굵기뿐) */
function kfaStyleFor(style) {
    return styleWeight(style) >= 600 ? "Bold" : "Regular";
}
/** 바꿀 글꼴이면 KFA 글꼴, 아니면 null (이미 KFA 이거나 다른 글꼴은 그대로) */
function swapToKfa(font) {
    return font.family.trim() === exports.SOURCE_FAMILY ? { family: exports.KFA_FAMILY, style: kfaStyleFor(font.style) } : null;
}
/** 이 컴퓨터에 없는 KFA 스타일 — 하나라도 없으면 아무것도 바꾸지 않는다 */
function missingKfaStyles(available) {
    return exports.KFA_STYLES.filter((style) => !available.some((f) => f.family === exports.KFA_FAMILY && f.style === style));
}

  },
  "figma-plugin/src/poster.ts": function (module, exports, __require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAGE_FIELDS = exports.POSTER_PAGE = exports.POSTER_TEMPLATES = void 0;
exports.templateKind = templateKind;
exports.layerField = layerField;
exports.peopleFor = peopleFor;
exports.posterValues = posterValues;
exports.planFill = planFill;
exports.imageProxyUrl = imageProxyUrl;
/** 05 Posters 템플릿 이름 (앞부분) ↔ 종류 */
exports.POSTER_TEMPLATES = [
    { kind: "matchday", name: "MATCH DAY" },
    { kind: "result", name: "경기결과" },
    { kind: "welcome", name: "WELCOME" },
    { kind: "goodluck", name: "GOOD LUCK" },
];
/** 포스터 템플릿이 있는 페이지 이름 (앞부분) */
exports.POSTER_PAGE = "05 Posters";
/** 이미지로 채우는 필드 — 나머지는 글자 */
exports.IMAGE_FIELDS = new Set(["clubEmblem", "playerPhoto", "newsImage", "sponsorLogo"]);
/** 같은 이름 레이어가 여러 개면 차례로 채우는 목록 필드 (스폰서) */
const SPONSOR_FIELDS = ["sponsorLogo", "sponsorName", "sponsorTierLabel", "sponsorTier"];
/** 템플릿 이름 → 종류. 'MATCH DAY', 'MATCH DAY 1080x1350', 'MATCH DAY / 1080x1080' 모두 matchday */
function templateKind(name) {
    const n = name.trim();
    for (const t of exports.POSTER_TEMPLATES) {
        if (n === t.name || n.startsWith(`${t.name} `) || n.startsWith(`${t.name}/`))
            return t.kind;
    }
    return null;
}
/** 레이어 이름 → 필드. '#opponent', '#opponent 2' → 'opponent'. '#' 로 시작하지 않으면 null */
function layerField(name) {
    const m = /^#([A-Za-z][A-Za-z0-9]*)/.exec(name.trim());
    return m ? m[1] : null;
}
function stringify(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined)
            out[k] = exports.IMAGE_FIELDS.has(k) ? null : "";
        else if (typeof v === "boolean")
            continue; // isHome/isStaff — 포스터 글자가 아니다 (homeAway 를 쓴다)
        else
            out[k] = String(v);
    }
    return out;
}
/** 영입/작별 고를 사람 목록 */
function peopleFor(feed, kind) {
    if (kind === "welcome")
        return feed.recentSignings;
    if (kind === "goodluck")
        return feed.recentFarewells;
    return [];
}
/**
 * 피드 + 포스터 종류 → 채울 값. 데이터가 없으면(다음 경기 없음 등) 이유 글자.
 * index: WELCOME/GOOD LUCK 에서 몇 번째 사람인지 (0 = 가장 최근)
 */
function posterValues(feed, kind, index = 0) {
    const lists = {};
    for (const f of SPONSOR_FIELDS)
        lists[f] = feed.sponsors.map((s) => { var _a; return (_a = s[f]) !== null && _a !== void 0 ? _a : null; });
    const club = stringify(feed.club);
    if (kind === "matchday") {
        const m = feed.nextMatch;
        if (!m)
            return { error: "예정된 경기가 없습니다 (관리자 › 경기에서 '예정' 경기를 넣어 주세요)" };
        return { single: Object.assign(Object.assign({}, club), stringify(m)), lists, title: `MATCH DAY ${m.date.slice(0, 10)} ${m.opponent}` };
    }
    if (kind === "result") {
        const r = feed.lastResult;
        if (!r)
            return { error: "점수가 들어간 끝난 경기가 없습니다" };
        return { single: Object.assign(Object.assign({}, club), stringify(r)), lists, title: `경기결과 ${r.date.slice(0, 10)} ${r.opponent} ${r.score}` };
    }
    const people = peopleFor(feed, kind);
    const p = people[index];
    if (!p)
        return { error: kind === "welcome" ? "최근 180일 영입 소식이 없습니다" : "최근 180일 작별 소식이 없습니다" };
    return { single: Object.assign(Object.assign({}, club), stringify(p)), lists, title: `${kind === "welcome" ? "WELCOME" : "GOOD LUCK"} ${p.playerName}` };
}
/**
 * 레이어 목록(문서 순서) → 채우기 계획. 모르는 필드/맞지 않는 레이어 종류는 skipped 로 알려 준다.
 * 이미지 값이 null 이면 그 레이어는 템플릿 그대로 둔다(계획에서 뺀다).
 */
function planFill(layers, values) {
    var _a, _b;
    const steps = [];
    const skipped = [];
    const used = {};
    for (const layer of layers) {
        const field = layerField(layer.name);
        if (!field)
            continue;
        let value;
        if (field in values.lists) {
            const i = (_a = used[field]) !== null && _a !== void 0 ? _a : 0;
            used[field] = i + 1;
            value = (_b = values.lists[field][i]) !== null && _b !== void 0 ? _b : (exports.IMAGE_FIELDS.has(field) ? null : "");
        }
        else if (field in values.single) {
            value = values.single[field];
        }
        else {
            skipped.push(`${layer.name}: 모르는 필드`);
            continue;
        }
        if (exports.IMAGE_FIELDS.has(field)) {
            if (layer.kind !== "shape")
                skipped.push(`${layer.name}: 이미지 필드는 도형/프레임 레이어에 두세요`);
            else if (value)
                steps.push({ id: layer.id, field, image: value });
        }
        else if (layer.kind !== "text") {
            skipped.push(`${layer.name}: 글자 필드는 텍스트 레이어에 두세요`);
        }
        else {
            steps.push({ id: layer.id, field, text: value !== null && value !== void 0 ? value : "" });
        }
    }
    return { steps, skipped };
}
/** 이미지 원본 주소 → 플러그인이 받을 주소 (사이트 이미지 중계, manifest 가 eunpyeong-fs.com 만 허용) */
function imageProxyUrl(src, siteUrl = "https://eunpyeong-fs.com") {
    return `${siteUrl}/api/figma/image?src=${encodeURIComponent(src)}`;
}

  },
  "figma-plugin/src/variables.ts": function (module, exports, __require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.figmaColorToCss = figmaColorToCss;
exports.cssToFigmaColor = cssToFigmaColor;
exports.tokensToVariableSpecs = tokensToVariableSpecs;
exports.variablesToTokens = variablesToTokens;
exports.sameFigmaValue = sameFigmaValue;
exports.isVariableAlias = isVariableAlias;
exports.describeFigmaValue = describeFigmaValue;
// 토큰 ↔ 피그마 변수 값 바꾸기 — 순수 함수 (테스트: tests/figma-plugin.test.ts). docs/FIGMA_SYNC.md 약속 A.
// 이름 규칙/색 표기/비교는 scripts/figma/tokens.ts 를 같이 쓴다 (코드와 플러그인이 같은 규칙).
const tokens_ts_1 = __require("scripts/figma/tokens.ts");
/** 피그마 색(0~1) → CSS 표기 */
function figmaColorToCss(c) {
    return (0, tokens_ts_1.formatColor)({ r: c.r * 255, g: c.g * 255, b: c.b * 255, a: c.a });
}
/** CSS 색 → 피그마 색(0~1) */
function cssToFigmaColor(value) {
    const c = (0, tokens_ts_1.parseColor)(value);
    return { r: c.r / 255, g: c.g / 255, b: c.b / 255, a: c.a };
}
function toFigmaValue(t, v) {
    if (t.type === "color")
        return cssToFigmaColor(String(v));
    if (t.type === "fontFamily")
        return Array.isArray(v) ? v[0] : String(v);
    return parseFloat(String(v));
}
/** tokens.json → 만들 변수 목록. 변수 이름 = 토큰 경로('color/blue'), 컬렉션 = 그룹(Color/Radius/Layout/Font) */
function tokensToVariableSpecs(tokens) {
    return (0, tokens_ts_1.flattenTokens)(tokens).map((t) => {
        const [group] = (0, tokens_ts_1.splitPath)(t.path);
        const spec = {
            collection: tokens_ts_1.COLLECTION_BY_GROUP[group],
            name: t.path,
            type: t.type === "color" ? "COLOR" : t.type === "fontFamily" ? "STRING" : "FLOAT",
            desktop: toFigmaValue(t, t.value),
        };
        if (t.mobile !== undefined)
            spec.mobile = toFigmaValue(t, t.mobile);
        return spec;
    });
}
const isRgba = (v) => typeof v === "object" && v !== null && "r" in v;
function fromFigmaValue(type, group, v) {
    if (type === "COLOR" && isRgba(v))
        return figmaColorToCss(v);
    if (type === "FLOAT" && typeof v === "number")
        return `${Math.round(v * 100) / 100}px`;
    if (type === "STRING" && group === "font")
        return [String(v)];
    return String(v);
}
/**
 * 피그마 변수 → tokens.json 모양 ('토큰 내보내기'). 아는 컬렉션(Color/Space/Radius/Layout/Font)만, BOOLEAN 은 뺀다.
 * 휴대폰 값은 기본 값과 다를 때만 $extensions.mobile.
 */
function variablesToTokens(records) {
    const flat = [];
    const skipped = [];
    for (const r of records) {
        const path = (0, tokens_ts_1.figmaVariableToPath)(r.collection, r.name);
        if (!path)
            continue;
        if (r.type === "BOOLEAN" || typeof r.desktop === "boolean" || typeof r.mobile === "boolean") {
            skipped.push(`${r.collection}/${r.name}: 참/거짓 변수는 토큰이 아닙니다`);
            continue;
        }
        const [group] = (0, tokens_ts_1.splitPath)(path);
        const type = r.type === "COLOR" ? "color" : r.type === "FLOAT" ? "dimension" : group === "font" ? "fontFamily" : null;
        if (!type) {
            skipped.push(`${r.collection}/${r.name}: 글자 변수는 Font 컬렉션에만 씁니다`);
            continue;
        }
        const value = fromFigmaValue(r.type, group, r.desktop);
        const t = { path, type, value };
        if (r.mobile !== undefined) {
            const m = fromFigmaValue(r.type, group, r.mobile);
            if (JSON.stringify(m) !== JSON.stringify(value))
                t.mobile = m;
        }
        flat.push(t);
    }
    return { tokens: (0, tokens_ts_1.unflattenTokens)(flat, "피그마 변수에서 내보낸 토큰 (플러그인 '토큰 내보내기'). design/tokens.json 과 비교: npm run figma:check <이 파일>"), skipped };
}
/** 두 피그마 값이 같은지 (색은 표기로 비교 — 소수점 오차 무시) */
function sameFigmaValue(type, a, b) {
    if (type === "COLOR")
        return isRgba(a) && isRgba(b) && figmaColorToCss(a) === figmaColorToCss(b);
    if (type === "FLOAT")
        return typeof a === "number" && typeof b === "number" && Math.abs(a - b) < 0.005;
    return a === b;
}
/** 피그마 변수 값이 다른 변수를 가리키는 별칭인지 */
function isVariableAlias(v) {
    return typeof v === "object" && v !== null && v.type === "VARIABLE_ALIAS";
}
/** 보고용 값 글자 — 색은 CSS 표기, 숫자는 px */
function describeFigmaValue(v) {
    if (isRgba(v))
        return figmaColorToCss(v);
    if (typeof v === "number")
        return `${Math.round(v * 100) / 100}px`;
    if (isVariableAlias(v))
        return "(풀 수 없는 별칭)";
    return String(v);
}

  },
  "figma-plugin/src/code.ts": function (module, exports, __require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tokens_ts_1 = __require("scripts/figma/tokens.ts");
const fonts_ts_1 = __require("figma-plugin/src/fonts.ts");
const poster_ts_1 = __require("figma-plugin/src/poster.ts");
const variables_ts_1 = __require("figma-plugin/src/variables.ts");
/** 이 플러그인이 아는 피드 판 (src/lib/figma-feed.ts FIGMA_FEED_VERSION) */
const FEED_VERSION = 1;
/** 복제본 이름 앞에 붙인다 — 다음에 채울 때 템플릿으로 착각하지 않게 */
const FILLED_PREFIX = "채움 ";
const GAP = 80;
function report(ok, message, details = []) {
    figma.ui.postMessage({ type: "result", ok, message, details });
    figma.notify(message, { error: !ok });
}
// ── 이미지 (화면에 받아 달라고 부탁) ─────────────
let nextRequestId = 1;
const pendingImages = new Map();
function requestImages(urls) {
    if (urls.length === 0)
        return Promise.resolve({ images: {}, errors: [] });
    const requestId = nextRequestId++;
    return new Promise((resolve) => {
        pendingImages.set(requestId, resolve);
        figma.ui.postMessage({ type: "need-images", requestId, urls });
    });
}
// ── 포스터 채우기 ───────────────────────────────
function isTemplateNode(n) {
    return (n.type === "COMPONENT" || n.type === "FRAME") && !n.name.startsWith(FILLED_PREFIX);
}
function layerInfo(n) {
    if (n.type === "TEXT")
        return { id: n.id, name: n.name, kind: "text" };
    return { id: n.id, name: n.name, kind: "fills" in n ? "shape" : "other" };
}
/** 템플릿과 같은 높이 줄에서 가장 오른쪽 + 간격 */
function nextX(template) {
    const siblings = template.parent ? template.parent.children : [];
    let right = template.x + template.width;
    for (const s of siblings) {
        const overlaps = s.y < template.y + template.height && s.y + s.height > template.y;
        if (overlaps)
            right = Math.max(right, s.x + s.width);
    }
    return right + GAP;
}
async function setText(node, text) {
    if (node.hasMissingFont)
        return `${node.name}: 글꼴이 설치되어 있지 않아 건너뜀`;
    const fonts = typeof node.fontName === "symbol" ? node.getRangeAllFontNames(0, node.characters.length) : [node.fontName];
    for (const f of fonts)
        await figma.loadFontAsync(f);
    node.characters = text;
    return null;
}
async function fillPosters(feed, kind, index) {
    var _a;
    if (!feed || typeof feed !== "object")
        return report(false, "피드를 읽지 못했습니다");
    const warnings = [];
    if (feed.version !== FEED_VERSION)
        warnings.push(`피드 판 ${feed.version} (플러그인은 ${FEED_VERSION}) — 플러그인을 새로 빌드하세요`);
    const page = figma.root.children.find((p) => p.name.trim().startsWith(poster_ts_1.POSTER_PAGE));
    if (!page)
        return report(false, `'${poster_ts_1.POSTER_PAGE}' 페이지가 없습니다`);
    await page.loadAsync();
    const templates = page
        .findAll((n) => isTemplateNode(n) && (0, poster_ts_1.templateKind)(n.name) === kind && n.parent !== null && (n.parent.type === "PAGE" || n.parent.type === "SECTION"))
        .filter(isTemplateNode);
    if (templates.length === 0)
        return report(false, `'${poster_ts_1.POSTER_PAGE}' 에 이 포스터 템플릿이 없습니다 (이름 규칙: docs/FIGMA_SYNC.md B-3)`);
    const indexes = index === "all" ? (0, poster_ts_1.peopleFor)(feed, kind).map((_, i) => i) : [index];
    if (indexes.length === 0)
        indexes.push(0); // 사람이 없으면 posterValues 가 이유를 알려 준다
    const jobs = [];
    for (const i of indexes) {
        const values = (0, poster_ts_1.posterValues)(feed, kind, i);
        if ("error" in values)
            return report(false, values.error);
        for (const t of templates) {
            const clone = t.type === "COMPONENT" ? t.createInstance().detachInstance() : t.clone();
            (_a = t.parent) === null || _a === void 0 ? void 0 : _a.appendChild(clone);
            clone.x = nextX(t);
            clone.y = t.y;
            clone.name = `${FILLED_PREFIX}${values.title}${templates.length > 1 ? ` (${t.width}x${t.height})` : ""}`;
            const { steps, skipped } = (0, poster_ts_1.planFill)(clone.findAll().map(layerInfo), values);
            warnings.push(...skipped);
            jobs.push({ clone, steps });
        }
    }
    const urls = [...new Set(jobs.flatMap((j) => j.steps.flatMap((s) => ("image" in s && s.image ? [s.image] : []))))];
    const { images, errors } = await requestImages(urls);
    warnings.push(...errors);
    const hashes = new Map();
    for (const [url, bytes] of Object.entries(images)) {
        if (!bytes)
            continue;
        try {
            hashes.set(url, figma.createImage(bytes).hash);
        }
        catch (_b) {
            warnings.push(`이미지를 넣지 못했습니다: ${url}`);
        }
    }
    for (const job of jobs) {
        for (const step of job.steps) {
            const node = (await figma.getNodeByIdAsync(step.id));
            if (!node)
                continue;
            if ("text" in step) {
                const w = await setText(node, step.text);
                if (w)
                    warnings.push(w);
            }
            else if (step.image && hashes.has(step.image)) {
                node.fills = [{ type: "IMAGE", scaleMode: "FILL", imageHash: hashes.get(step.image) }];
            }
        }
    }
    await figma.setCurrentPageAsync(page);
    const clones = jobs.map((j) => j.clone);
    page.selection = clones;
    figma.viewport.scrollAndZoomIntoView(clones);
    report(true, `포스터 ${clones.length}장을 채웠습니다`, [...new Set(warnings)]);
}
// ── 토큰 내보내기 ───────────────────────────────
async function resolveValue(value, modeName, depth = 0) {
    var _a, _b, _c;
    if (typeof value !== "object" || value === null || !("type" in value) || value.type !== "VARIABLE_ALIAS" || depth > 10)
        return value;
    const target = await figma.variables.getVariableByIdAsync(value.id);
    if (!target)
        return value;
    const col = await figma.variables.getVariableCollectionByIdAsync(target.variableCollectionId);
    const modeId = (_c = (_b = (_a = col === null || col === void 0 ? void 0 : col.modes.find((m) => m.name === modeName)) === null || _a === void 0 ? void 0 : _a.modeId) !== null && _b !== void 0 ? _b : col === null || col === void 0 ? void 0 : col.defaultModeId) !== null && _c !== void 0 ? _c : Object.keys(target.valuesByMode)[0];
    return resolveValue(target.valuesByMode[modeId], modeName, depth + 1);
}
function desktopMode(col) {
    var _a, _b;
    return (_b = (_a = col.modes.find((m) => m.name === tokens_ts_1.MODE_DESKTOP)) === null || _a === void 0 ? void 0 : _a.modeId) !== null && _b !== void 0 ? _b : col.defaultModeId;
}
async function exportTokens() {
    var _a;
    const cols = (await figma.variables.getLocalVariableCollectionsAsync()).filter((c) => !c.remote);
    const vars = await figma.variables.getLocalVariablesAsync();
    const records = [];
    for (const v of vars) {
        const col = cols.find((c) => c.id === v.variableCollectionId);
        if (!col || !(0, tokens_ts_1.figmaVariableToPath)(col.name, v.name))
            continue;
        const mobileId = (_a = col.modes.find((m) => m.name === tokens_ts_1.MODE_MOBILE)) === null || _a === void 0 ? void 0 : _a.modeId;
        const record = {
            collection: col.name,
            name: v.name,
            type: v.resolvedType,
            desktop: (await resolveValue(v.valuesByMode[desktopMode(col)], tokens_ts_1.MODE_DESKTOP)),
        };
        if (mobileId)
            record.mobile = (await resolveValue(v.valuesByMode[mobileId], tokens_ts_1.MODE_MOBILE));
        records.push(record);
    }
    const { tokens, skipped } = (0, variables_ts_1.variablesToTokens)(records);
    figma.ui.postMessage({ type: "exported", json: `${JSON.stringify(tokens, null, 2)}\n`, count: records.length - skipped.length, skipped });
}
// ── 토큰 가져오기 ───────────────────────────────
async function importTokens(tokens) {
    var _a, _b;
    let specs;
    try {
        specs = (0, variables_ts_1.tokensToVariableSpecs)(tokens);
    }
    catch (e) {
        return report(false, `tokens.json 을 읽지 못했습니다: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (specs.length === 0)
        return report(false, "토큰이 하나도 없습니다");
    const cols = (await figma.variables.getLocalVariableCollectionsAsync()).filter((c) => !c.remote);
    const vars = await figma.variables.getLocalVariablesAsync();
    const problems = [];
    let created = 0;
    let updated = 0;
    let same = 0;
    for (const name of [...new Set(specs.map((s) => s.collection))]) {
        const group = specs.filter((s) => s.collection === name);
        let col = cols.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
        if (!col) {
            col = figma.variables.createVariableCollection(name);
            cols.push(col);
        }
        if (!col.modes.some((m) => m.name === tokens_ts_1.MODE_DESKTOP)) {
            if (col.modes.length === 1)
                col.renameMode(col.defaultModeId, tokens_ts_1.MODE_DESKTOP);
            else
                problems.push(`${name}: '${tokens_ts_1.MODE_DESKTOP}' 모드가 없어 기본 모드에 넣었습니다`);
        }
        let mobileId = (_a = col.modes.find((m) => m.name === tokens_ts_1.MODE_MOBILE)) === null || _a === void 0 ? void 0 : _a.modeId;
        if (!mobileId && group.some((s) => s.mobile !== undefined)) {
            try {
                mobileId = col.addMode(tokens_ts_1.MODE_MOBILE);
            }
            catch (e) {
                problems.push(`${name}: '${tokens_ts_1.MODE_MOBILE}' 모드를 만들지 못했습니다 (${e instanceof Error ? e.message : String(e)})`);
            }
        }
        const desktopId = desktopMode(col);
        for (const spec of group) {
            const collection = col;
            let v = vars.find((x) => x.variableCollectionId === collection.id && (0, tokens_ts_1.figmaVariableToPath)(collection.name, x.name) === spec.name);
            if (v && v.resolvedType !== spec.type) {
                problems.push(`${spec.name}: 피그마 변수 종류(${v.resolvedType})가 토큰(${spec.type})과 달라 건너뜀`);
                continue;
            }
            let changed = false;
            const isNew = !v;
            if (!v) {
                v = figma.variables.createVariable(spec.name, collection, spec.type);
                vars.push(v);
            }
            const wanted = [[desktopId, tokens_ts_1.MODE_DESKTOP, spec.desktop]];
            if (mobileId)
                wanted.push([mobileId, tokens_ts_1.MODE_MOBILE, (_b = spec.mobile) !== null && _b !== void 0 ? _b : spec.desktop]);
            for (const [modeId, modeName, value] of wanted) {
                const current = v.valuesByMode[modeId];
                // 별칭(다른 변수 참조)은 디자이너가 일부러 이은 것 — 고정값으로 덮지 않는다. 참조 값이 다르면 알려만 준다
                if ((0, variables_ts_1.isVariableAlias)(current)) {
                    const resolved = await resolveValue(current, modeName);
                    if (!(0, variables_ts_1.sameFigmaValue)(spec.type, resolved, value)) {
                        problems.push(`${spec.name} [${modeName}]: 다른 변수를 참조하는 별칭이라 바꾸지 않았습니다 (참조 값 ${(0, variables_ts_1.describeFigmaValue)(resolved)}, 토큰 ${(0, variables_ts_1.describeFigmaValue)(value)})`);
                    }
                    continue;
                }
                if (!(0, variables_ts_1.sameFigmaValue)(spec.type, current, value)) {
                    v.setValueForMode(modeId, value);
                    changed = true;
                }
            }
            if (isNew)
                created++;
            else if (changed)
                updated++;
            else
                same++;
        }
    }
    report(problems.length === 0, `토큰 가져오기: 새로 ${created}개, 바꿈 ${updated}개, 그대로 ${same}개`, problems);
}
// ── KFA 글꼴 적용 ───────────────────────────────
const errText = (e) => (e instanceof Error ? e.message : String(e));
/** 인스턴스 안 레이어인지 — 원본 컴포넌트를 먼저 바꾸면 따라 바뀌므로 나중에 본다 */
function insideInstance(n) {
    for (let p = n.parent; p; p = p.parent)
        if (p.type === "INSTANCE")
            return true;
    return false;
}
async function applyKfaFont() {
    const available = (await figma.listAvailableFontsAsync()).map((f) => f.fontName);
    const missing = (0, fonts_ts_1.missingKfaStyles)(available);
    if (missing.length > 0) {
        return report(false, `글꼴이 설치되어 있지 않습니다: ${fonts_ts_1.KFA_FAMILY} ${missing.join(", ")}`, [
            "이 컴퓨터에 KFA고딕(Regular, Bold)을 설치하고 피그마 데스크톱을 다시 연 뒤 눌러 주세요. 아무것도 바꾸지 않았습니다.",
        ]);
    }
    for (const style of fonts_ts_1.KFA_STYLES)
        await figma.loadFontAsync({ family: fonts_ts_1.KFA_FAMILY, style });
    const failures = [];
    let styles = 0;
    for (const st of await figma.getLocalTextStylesAsync()) {
        const target = (0, fonts_ts_1.swapToKfa)(st.fontName);
        if (!target)
            continue;
        try {
            st.fontName = target;
            styles++;
        }
        catch (e) {
            failures.push(`글꼴 스타일 '${st.name}': ${errText(e)}`);
        }
    }
    let layers = 0;
    for (const page of figma.root.children) {
        await page.loadAsync();
        const texts = page.findAll((n) => n.type === "TEXT");
        texts.sort((a, b) => Number(insideInstance(a)) - Number(insideInstance(b)));
        for (const t of texts) {
            let changed = false;
            const segments = t.characters.length > 0
                ? t.getStyledTextSegments(["fontName"])
                : typeof t.fontName === "symbol"
                    ? []
                    : [{ start: 0, end: 0, characters: "", fontName: t.fontName }];
            for (const seg of segments) {
                const target = (0, fonts_ts_1.swapToKfa)(seg.fontName);
                if (!target)
                    continue;
                try {
                    await figma.loadFontAsync(seg.fontName).catch(() => undefined); // 옛 글꼴이 없어도 바꿀 수는 있다
                    if (seg.end > seg.start)
                        t.setRangeFontName(seg.start, seg.end, target);
                    else
                        t.fontName = target;
                    changed = true;
                }
                catch (e) {
                    failures.push(`${page.name} / ${t.name}: ${errText(e)}`);
                }
            }
            if (changed)
                layers++;
        }
    }
    report(failures.length === 0, `KFA 글꼴 적용: 글꼴 스타일 ${styles}개, 텍스트 레이어 ${layers}개를 바꿨습니다`, failures.slice(0, 50));
}
// ── 시작 ────────────────────────────────────────
figma.showUI(__html__, { width: 380, height: 560, title: "덴포스 피그마 동기화" });
figma.ui.postMessage({ type: "init", bundledTokens: Object.keys(BUNDLED_TOKENS).filter((k) => !k.startsWith("$")) });
figma.ui.onmessage = (raw) => {
    const msg = raw;
    const run = async () => {
        var _a;
        if (msg.type === "fill")
            await fillPosters(msg.feed, msg.kind, msg.index);
        else if (msg.type === "images") {
            (_a = pendingImages.get(msg.requestId)) === null || _a === void 0 ? void 0 : _a({ images: msg.images, errors: msg.errors });
            pendingImages.delete(msg.requestId);
        }
        else if (msg.type === "export-tokens")
            await exportTokens();
        else if (msg.type === "apply-kfa")
            await applyKfaFont();
        else if (msg.type === "import-tokens") {
            let tokens = BUNDLED_TOKENS;
            if (msg.json) {
                try {
                    tokens = JSON.parse(msg.json);
                }
                catch (_b) {
                    return report(false, "붙여 넣은 글이 JSON 이 아닙니다");
                }
            }
            await importTokens(tokens);
        }
    };
    run().catch((e) => report(false, `오류: ${e instanceof Error ? e.message : String(e)}`));
};

  },
};
var __cache = {};
function __require(id) {
  if (__cache[id]) return __cache[id].exports;
  var module = (__cache[id] = { exports: {} });
  __modules[id](module, module.exports, __require);
  return module.exports;
}
__require("figma-plugin/src/code.ts");
})();
