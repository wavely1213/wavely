/* Playwright 를 어디서 찾을지는 기기마다 다르다.
   전역 설치, 저장소 루트, game/app — 순서대로 찾아보고 없으면 무엇을 하라고 알려 준다.
   (절대 경로를 박아 두면 만든 사람 컴퓨터에서만 돌아간다.) */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));

const ANCHORS = [
  path.join(DIR, "../../package.json"),   // 저장소 루트
  path.join(DIR, "../app/package.json"),  // 게임 앱
  import.meta.url,                        // 이 파일 기준(전역 설치가 잡히는 경우)
];

/* 컨테이너·CI 처럼 전역에만 있는 환경 */
const GLOBAL_GUESSES = [
  "/opt/node22/lib/node_modules/playwright/index.mjs",
  "/usr/lib/node_modules/playwright/index.mjs",
  "/usr/local/lib/node_modules/playwright/index.mjs",
];

export const HELP =
  "Playwright 를 못 찾았다. 저장소 루트에서:\n" +
  "    npm i -D playwright && npx playwright install chromium";

/* @returns Playwright 모듈, 없으면 null */
export async function loadPlaywright() {
  for (const anchor of ANCHORS) {
    try {
      const req = createRequire(anchor);
      return await import(req.resolve("playwright"));
    } catch { /* 다음 후보 */ }
  }
  for (const p of GLOBAL_GUESSES) {
    if (fs.existsSync(p)) { try { return await import(p); } catch { /* 다음 후보 */ } }
  }
  return null;
}

/* 없으면 안내만 하고 검사를 건너뛴다 — 브라우저가 없다고 실패로 세지 않는다 */
export async function chromiumOrSkip() {
  const pw = await loadPlaywright();
  if (!pw) { console.log("건너뜀 — " + HELP); process.exit(0); }
  return pw.chromium;
}
