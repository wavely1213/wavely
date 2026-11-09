// 피그마 플러그인 묶기 (D-066) — 새 의존성 없이 기존 typescript 로만 (DEPENDENCY_POLICY).
// figma-plugin/src/code.ts 에서 시작해 상대 경로 import 를 따라가며 파일마다 CommonJS 로 바꾸고, 한 파일(dist/code.js)로 잇는다.
// design/tokens.json 은 BUNDLED_TOKENS 로, src/styles/tokens.css 는 화면(dist/ui.html)의 색으로 넣는다.
// 순수하게 '파일 읽기 함수 → 결과 글자'라서 테스트가 dist 가 최신인지 확인할 수 있다 (tests/figma-plugin.test.ts).
import ts from "typescript";

export const PLUGIN_ENTRY = "figma-plugin/src/code.ts";
const HEADER = "// 자동 생성 — 직접 고치지 말 것. 원본 figma-plugin/src, 빌드: npm run figma:plugin (D-066)\n";

/** 'a/b/c.ts' 기준으로 './d.ts' / '../../x/y.ts' 를 푼다 (저장소 루트 기준 경로) */
export function resolvePath(from: string, spec: string): string {
  const parts = from.split("/").slice(0, -1);
  for (const p of spec.split("/")) {
    if (p === "..") parts.pop();
    else if (p !== ".") parts.push(p);
  }
  return parts.join("/");
}

/** 플러그인 코드 묶음 (dist/code.js 내용) */
export function bundlePluginCode(read: (path: string) => string): string {
  const order: string[] = [];
  const bodies = new Map<string, string>();
  const visit = (id: string) => {
    if (bodies.has(id)) return;
    bodies.set(id, "");
    const out = ts.transpileModule(read(id), {
      fileName: id,
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, verbatimModuleSyntax: false, removeComments: false },
    }).outputText;
    const body = out.replace(/require\("([^"]+)"\)/g, (whole, spec: string) => {
      if (!spec.startsWith(".")) throw new Error(`${id}: 플러그인은 바깥 패키지(${spec})를 쓸 수 없습니다`);
      const dep = resolvePath(id, spec);
      visit(dep);
      return `__require(${JSON.stringify(dep)})`;
    });
    bodies.set(id, body);
    order.push(id);
  };
  visit(PLUGIN_ENTRY);

  const tokens = JSON.stringify(JSON.parse(read("design/tokens.json")));
  const modules = order.map((id) => `  ${JSON.stringify(id)}: function (module, exports, __require) {\n${bodies.get(id)}\n  },`).join("\n");
  return `${HEADER}/* eslint-disable */
(function () {
"use strict";
var BUNDLED_TOKENS = ${tokens};
var __modules = {
${modules}
};
var __cache = {};
function __require(id) {
  if (__cache[id]) return __cache[id].exports;
  var module = (__cache[id] = { exports: {} });
  __modules[id](module, module.exports, __require);
  return module.exports;
}
__require(${JSON.stringify(PLUGIN_ENTRY)});
})();
`;
}

/** 플러그인 화면 (dist/ui.html 내용) — tokens.css 를 색 자리에 넣는다 */
export function buildPluginUi(read: (path: string) => string): string {
  const css = read("src/styles/tokens.css").replace(/\/\*[\s\S]*?\*\//g, "").trim();
  const html = read("figma-plugin/ui.html");
  if (!html.includes("/*__TOKENS_CSS__*/")) throw new Error("ui.html 에 /*__TOKENS_CSS__*/ 자리가 없습니다");
  return `<!-- ${HEADER.slice(3).trim()} -->\n${html.replace("/*__TOKENS_CSS__*/", css)}`;
}
