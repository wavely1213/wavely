// 피그마 플러그인 빌드 → figma-plugin/dist/code.js, dist/ui.html (D-066, docs/FIGMA_SYNC.md 약속 C)
// 실행 (sites/eunpyeong-denforce 에서): npm run figma:plugin        (쓰기)
//                                       npm run figma:plugin -- --check (최신인지만, 다르면 종료 코드 1)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPluginUi, bundlePluginCode } from "./plugin-bundle.ts";

const root = join(import.meta.dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const outputs: Array<[string, string]> = [
  ["figma-plugin/dist/code.js", bundlePluginCode(read)],
  ["figma-plugin/dist/ui.html", buildPluginUi(read)],
];

if (process.argv.includes("--check")) {
  const stale = outputs.filter(([p, text]) => {
    try {
      return read(p) !== text;
    } catch {
      return true;
    }
  });
  if (stale.length > 0) {
    console.error(`플러그인 빌드가 최신이 아닙니다: ${stale.map(([p]) => p).join(", ")} — npm run figma:plugin`);
    process.exit(1);
  }
  console.log("figma-plugin/dist 최신");
} else {
  mkdirSync(join(root, "figma-plugin", "dist"), { recursive: true });
  for (const [p, text] of outputs) writeFileSync(join(root, p), text);
  console.log(`작성: ${outputs.map(([p, t]) => `${p} (${t.length} bytes)`).join(", ")}`);
}
