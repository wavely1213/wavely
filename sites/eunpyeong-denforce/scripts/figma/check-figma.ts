// 피그마 변수 ↔ design/tokens.json 비교 (D-066, docs/FIGMA_SYNC.md 약속 A·단계 4)
// 피그마 플러그인 '토큰 내보내기'로 받은 JSON 파일을 넣으면, tokens.json 과 다른 곳을 한 줄씩 알려 준다.
// 실행 (sites/eunpyeong-denforce 에서):
//   node --experimental-strip-types --no-warnings scripts/figma/check-figma.ts <피그마에서 내보낸 JSON 경로>
// 다르면 종료 코드 1. 같은 검사가 npm test 에도 있다 (design/figma-variables.json 이 있을 때).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describeDiff, diffTokens, type TokensFile } from "./tokens.ts";

const file = process.argv[2];
if (!file) {
  console.error("사용법: check-figma.ts <피그마에서 내보낸 JSON 경로>");
  process.exit(2);
}
const root = join(import.meta.dirname, "..", "..");
const expected = JSON.parse(readFileSync(join(root, "design", "tokens.json"), "utf8")) as TokensFile;
const actual = JSON.parse(readFileSync(file, "utf8")) as TokensFile;
const diffs = diffTokens(expected, actual);
if (diffs.length > 0) {
  console.error(`피그마 변수와 tokens.json 이 ${diffs.length}곳 다릅니다:`);
  for (const d of diffs) console.error(`- ${describeDiff(d)}`);
  process.exit(1);
}
console.log("피그마 변수 = tokens.json");
