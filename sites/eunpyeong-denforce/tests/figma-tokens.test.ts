// 디자인 토큰 변환/비교 단위 테스트 (D-066, docs/FIGMA_SYNC.md 약속 A) — 실행: npm test
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  buildTokens,
  cssVarToPath,
  describeDiff,
  diffTokens,
  figmaVariableToPath,
  flattenTokens,
  formatColor,
  parseColor,
  parseTokensCss,
  pathToCssVar,
  stringifyTokens,
  unflattenTokens,
  type TokensFile,
} from "../scripts/figma/tokens.ts";

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const SAMPLE_CSS = `
/* 주석 :root { --c-fake: #000; } */
:root {
  --c-blue: #1A349A;
  --c-on-dark-sub: rgba(255, 255, 255, 0.64);
  --font: var(--font-kfa), "Apple SD Gothic Neo", system-ui, sans-serif;
  --radius-s: 6px;
  --gutter: 20px;
  --header-h: 80px;
}
@media (min-width: 1200px) { :root { --gutter: 40px; } }
@media (max-width: 720px) {
  :root {
    --gutter: 16px;
    --header-h: 80px;
  }
}
`;

test("parseTokensCss: :root 기본 값과 720px 이하 값만 읽고, 주석/다른 미디어 쿼리는 무시", () => {
  const { base, mobile } = parseTokensCss(SAMPLE_CSS);
  assert.equal(base.get("--c-blue"), "#1A349A");
  assert.equal(base.has("--c-fake"), false);
  assert.equal(base.get("--gutter"), "20px");
  assert.deepEqual([...mobile], [["--gutter", "16px"], ["--header-h", "80px"]]);
});

test("parseTokensCss: 블록 마지막 선언에 세미콜론이 없어도 읽는다", () => {
  const { base, mobile } = parseTokensCss(":root { --c-a: #fff; --gutter: 20px }\n@media (max-width: 720px) { :root { --gutter: 16px } }");
  assert.deepEqual([...base], [["--c-a", "#fff"], ["--gutter", "20px"]]);
  assert.deepEqual([...mobile], [["--gutter", "16px"]]);
});

test("cssVarToPath / pathToCssVar: 약속 A 이름 규칙과 그 반대", () => {
  const pairs: Array<[string, string]> = [
    ["--c-blue", "color/blue"],
    ["--c-on-dark-sub", "color/on-dark-sub"],
    ["--radius-s", "radius/s"],
    ["--space-m", "space/m"],
    ["--gutter", "layout/gutter"],
    ["--header-h", "layout/header-h"],
    ["--font", "font/family"],
  ];
  for (const [css, path] of pairs) {
    assert.equal(cssVarToPath(css), path);
    assert.equal(pathToCssVar(path), css);
  }
});

test("buildTokens: 그룹/종류/값, 휴대폰 값은 다를 때만 $extensions.mobile", () => {
  const t = buildTokens(SAMPLE_CSS);
  assert.deepEqual(Object.keys(t), ["$description", "color", "radius", "layout", "font"]);
  assert.deepEqual(t.color?.blue, { $type: "color", $value: "#1a349a" });
  assert.deepEqual(t.color?.["on-dark-sub"], { $type: "color", $value: "rgba(255, 255, 255, 0.64)" });
  assert.deepEqual(t.radius?.s, { $type: "dimension", $value: "6px" });
  assert.deepEqual(t.layout?.gutter, { $type: "dimension", $value: "20px", $extensions: { mobile: "16px" } });
  // 휴대폰 값이 같으면 넣지 않는다
  assert.deepEqual(t.layout?.["header-h"], { $type: "dimension", $value: "80px" });
  assert.deepEqual(t.font?.family.$value, ["KFAGothic TTF", "Apple SD Gothic Neo", "system-ui", "sans-serif"]);
});

test("buildTokens: 색/px/글꼴이 아닌 값, 기본 값 없는 휴대폰 값은 오류", () => {
  assert.throws(() => buildTokens(":root { --gutter: 2rem; }"), /토큰으로 옮길 수 없는 값/);
  assert.throws(() => buildTokens(":root { --c-a: #fff; } @media (max-width: 720px) { :root { --c-b: #000; } }"), /기본 값이 없습니다/);
});

test("parseColor / formatColor: hex 3/6/8자리, rgb(a) 를 같은 표기로", () => {
  assert.equal(formatColor(parseColor("#FFF")), "#ffffff");
  assert.equal(formatColor(parseColor("rgb(26, 52, 154)")), "#1a349a");
  assert.equal(formatColor(parseColor("#ffffffa3")), "rgba(255, 255, 255, 0.64)");
  assert.equal(formatColor({ r: 255, g: 255, b: 255, a: 0.6399 }), "rgba(255, 255, 255, 0.64)");
  assert.throws(() => parseColor("blue"));
});

test("flattenTokens / unflattenTokens: 되돌리면 같은 모양", () => {
  const t = buildTokens(SAMPLE_CSS);
  const back = unflattenTokens(flattenTokens(t));
  assert.deepEqual(back, t);
});

test("diffTokens: 같으면 빈 목록 — 피그마 숫자 변수, 대문자 hex, 휴대폰 값=기본 값도 같다고 본다", () => {
  const expected = buildTokens(SAMPLE_CSS);
  const actual: TokensFile = {
    color: {
      blue: { $type: "color", $value: "#1A349A" },
      "on-dark-sub": { $type: "color", $value: "#ffffffa3" },
    },
    radius: { s: { $type: "dimension", $value: "6px", $extensions: { mobile: "6px" } } },
    layout: {
      gutter: { $type: "dimension", $value: "20px", $extensions: { mobile: "16px" } },
      "header-h": { $type: "dimension", $value: "80px" },
    },
    font: { family: { $type: "fontFamily", $value: ["KFAGothic TTF"] } },
  };
  assert.deepEqual(diffTokens(expected, actual), []);
});

test("diffTokens: 빠짐/남음/값 다름/휴대폰 값 다름/종류 다름을 알려 준다", () => {
  const expected = buildTokens(SAMPLE_CSS);
  const actual: TokensFile = {
    color: { blue: { $type: "dimension", $value: "1px" }, extra: { $type: "color", $value: "#000000" } },
    radius: { s: { $type: "dimension", $value: "8px" } },
    layout: {
      gutter: { $type: "dimension", $value: "20px" },
      "header-h": { $type: "dimension", $value: "80px" },
    },
    font: { family: { $type: "fontFamily", $value: ["Pretendard"] } },
  };
  const lines = diffTokens(expected, actual).map(describeDiff);
  assert.deepEqual(lines, [
    "color/blue: 종류가 다름 (코드 color, 피그마 dimension)",
    "color/on-dark-sub: 피그마에 없음 (코드 값 rgba(255, 255, 255, 0.64))",
    "radius/s [Desktop]: 코드 6px, 피그마 8px",
    "radius/s [Mobile]: 코드 6px, 피그마 8px",
    "layout/gutter [Mobile]: 코드 16px, 피그마 20px",
    "font/family [Desktop]: 코드 KFAGothic TTF, 피그마 Pretendard",
    "font/family [Mobile]: 코드 KFAGothic TTF, 피그마 Pretendard",
    "color/extra: 코드(tokens.css)에 없는 피그마 변수 (#000000)",
  ]);
});

test("figmaVariableToPath: 변수 이름이 경로 그대로든 앞부분을 뺐든 같은 경로, 모르는 컬렉션은 null", () => {
  assert.equal(figmaVariableToPath("Color", "color/blue"), "color/blue");
  assert.equal(figmaVariableToPath("Color", "blue"), "color/blue");
  assert.equal(figmaVariableToPath("layout", "header-h"), "layout/header-h");
  assert.equal(figmaVariableToPath("Effects", "shadow"), null);
});

// ── 저장소의 실제 파일 ──────────────────────────

test("design/tokens.json 이 src/styles/tokens.css 와 같다 (다르면 build-tokens.ts 실행)", () => {
  assert.equal(read("design/tokens.json"), stringifyTokens(buildTokens(read("src/styles/tokens.css"))));
});

test("피그마 변수(design/figma-variables.json, 플러그인 '토큰 내보내기')가 tokens.json 과 같다", (t) => {
  const path = join(root, "design", "figma-variables.json");
  if (!existsSync(path)) {
    t.skip("design/figma-variables.json 없음 — 피그마에서 내보내 저장하면 검사한다");
    return;
  }
  const diffs = diffTokens(JSON.parse(read("design/tokens.json")), JSON.parse(readFileSync(path, "utf8")));
  assert.deepEqual(diffs.map(describeDiff), []);
});
