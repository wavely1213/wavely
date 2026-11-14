// tokens.css → design/tokens.json 만들기 (D-066, docs/FIGMA_SYNC.md 약속 A)
// 실행 (sites/eunpyeong-denforce 에서):
//   node --experimental-strip-types --no-warnings scripts/figma/build-tokens.ts          # 파일 쓰기
//   node --experimental-strip-types --no-warnings scripts/figma/build-tokens.ts --check  # 최신인지만 확인 (다르면 종료 코드 1)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildTokens, stringifyTokens } from "./tokens.ts";

const root = join(import.meta.dirname, "..", "..");
const cssPath = join(root, "src", "styles", "tokens.css");
const outPath = join(root, "design", "tokens.json");

const next = stringifyTokens(buildTokens(readFileSync(cssPath, "utf8")));

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(outPath, "utf8");
  } catch {
    // 없으면 아래에서 '다름'으로 처리
  }
  if (current !== next) {
    console.error("design/tokens.json 이 tokens.css 와 다릅니다. build-tokens.ts 를 실행해 다시 만들어 주세요.");
    process.exit(1);
  }
  console.log("design/tokens.json 최신");
} else {
  writeFileSync(outPath, next);
  console.log(`design/tokens.json 작성 (${next.length} bytes)`);
}
