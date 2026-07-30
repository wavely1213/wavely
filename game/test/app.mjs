/* 앱 검사 — 기기 없이 확인할 수 있는 것만 확인한다.

   ① 앱 소스가 바벨을 통과하는가
   ② 앱이 코어에서 가져다 쓰는 이름이 실제로 존재하는가
      (코어를 리팩터링하면 제일 먼저 조용히 깨지는 곳이다)
   ③ 소리 합성이 웹과 같은 파형을 내는가

   실행: node game/test/app.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(DIR, "../app");
const fails = [], ok = [];
const check = (n, c, d) => (c ? ok : fails).push(n + (c ? "" : " — " + d));

if (!fs.existsSync(path.join(APP, "node_modules"))) {
  console.log("건너뜀 — game/app 에서 npm install 을 먼저 실행할 것");
  process.exit(0);
}
const appRequire = createRequire(path.join(APP, "package.json"));

const SRC = ["App.jsx", "index.js", "metro.config.js", "babel.config.js",
  "src/GameField.jsx", "src/Hangar.jsx", "src/ui.jsx",
  "src/host.native.js", "src/sound.js", "src/synth.js", "src/theme.js"];

/* ── ① 바벨 ── */
{
  const babel = appRequire("@babel/core");
  const preset = appRequire.resolve("babel-preset-expo");
  for (const f of SRC) {
    try {
      babel.transformSync(fs.readFileSync(path.join(APP, f), "utf8"),
        { filename: f, presets: [preset], babelrc: false, configFile: false });
      ok.push("컴파일 " + f);
    } catch (e) { fails.push("컴파일 " + f + " — " + e.message.split("\n")[0]); }
  }
}

/* ── ② 코어 이름 ── */
{
  const core = await import(path.join(DIR, "../src/core/index.js"));
  const have = new Set(Object.keys(core));
  const missing = [];
  for (const f of SRC) {
    const s = fs.readFileSync(path.join(APP, f), "utf8");
    for (const m of s.matchAll(/import\s*\{([^}]*)\}\s*from\s*"[^"]*src\/core\/index"/g)) {
      for (const raw of m[1].split(",")) {
        const n = raw.trim().split(/\s+as\s+/)[0].trim();
        if (n && !have.has(n)) missing.push(`${f}: ${n}`);
      }
    }
  }
  check("앱이 쓰는 코어 이름이 전부 있다", missing.length === 0, missing.join(", "));
}

/* ── ③ 소리 ── */
{
  const synth = await import(path.join(APP, "src/synth.js"));
  const cases = [
    ["blip", () => synth.renderBlip(320, .03, "square", .012), .012],
    ["sweep", () => synth.renderSweep(240, 45, .26, .05), .05],
    ["noise", () => synth.renderNoise(1900, 9, .045, .05), .05],
  ];
  for (const [nm, gen, vol] of cases) {
    const a = gen();
    const peak = a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    const finite = a.every(Number.isFinite);
    /* 노이즈는 밴드패스를 지나며 진폭이 줄어든다 — 0 이 아니고 넘치지 않으면 된다 */
    check(`${nm} 파형`, finite && peak > 0 && peak <= vol * 1.05 + 1e-6,
      `피크 ${peak.toFixed(4)} / 상한 ${vol}, 유한 ${finite}`);
  }
  const w = synth.wav(synth.renderBlip(440, .05, "square", .05));
  const tag = o => String.fromCharCode(...w.slice(o, o + 4));
  check("WAV 헤더", tag(0) === "RIFF" && tag(8) === "WAVE" && tag(36) === "data",
    `${tag(0)}/${tag(8)}/${tag(36)}`);
}

for (const n of ok) console.log("  통과  " + n);
for (const n of fails) console.log("  실패  " + n);
console.log(`\n${ok.length} 통과 / ${fails.length} 실패`);
process.exit(fails.length ? 1 : 0);
