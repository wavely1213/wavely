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
  "src/GameField.jsx", "src/ShipPreview.jsx", "src/Plate.jsx", "src/Hangar.jsx", "src/ui.jsx",
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

/* ── ③ 패키지에서 가져다 쓰는 이름이 실제로 있는지 ──
   없는 API 를 부르면 기기에서만 터진다. 타입 선언을 읽어 미리 잡는다.
   (실제로 useKeepAwake 에 없는 옵션을 넘기는 코드를 쓴 적이 있다.) */
{
  /* 패키지 타입 선언에서 export 이름을 모은다. export * 는 끝까지 따라간다. */
  const seen = new Set();
  const collect = (file, out = new Set()) => {
    const isFile = f => { try { return fs.statSync(f).isFile(); } catch { return false; } };
    const real = isFile(file) ? file : isFile(file + ".d.ts") ? file + ".d.ts"
               : isFile(path.join(file, "index.d.ts")) ? path.join(file, "index.d.ts") : null;
    if (!real || seen.has(real)) return out;
    seen.add(real);
    let src;
    try { src = fs.readFileSync(real, "utf8"); } catch { return out; }
    /* 주석을 먼저 걷어낸다 — export 블록 안의 {@link ...} 가 중괄호 짝을 깨뜨린다 */
    src = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

    for (const m of src.matchAll(/^export\s+(?:declare\s+)?(?:abstract\s+)?(?:function|const|class|let|var|type|interface|enum)\s+([\w$]+)/gm)) out.add(m[1]);
    for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm))
      for (const raw of m[1].split(",")) {
        const n = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop().trim();
        if (n) out.add(n);
      }
    for (const m of src.matchAll(/^export\s+(?:type\s+)?\*\s+from\s+["']([^"']+)["']/gm)) {
      if (!m[1].startsWith(".")) continue;
      collect(path.resolve(path.dirname(real), m[1]), out);
    }
    return out;
  };

  const typesOf = pkg => {
    let dir, meta;
    try { dir = path.dirname(appRequire.resolve(pkg + "/package.json")); meta = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")); }
    catch { return null; }
    for (const c of [meta.types, meta.typings, "lib/typescript/src/index.d.ts", "build/index.d.ts",
                     "lib/typescript/index.d.ts", "types/index.d.ts", "types", "index.d.ts"]) {
      if (!c) continue;
      seen.clear();
      const n = collect(path.join(dir, c));
      if (n.size > 3) return n;
    }
    return null;
  };

  const cache = new Map(), missing = [], unchecked = new Set();
  for (const f of SRC) {
    const src = fs.readFileSync(path.join(APP, f), "utf8");
    for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^."'][^"']*)["']/g)) {
      const pkg = m[2];
      if (!cache.has(pkg)) cache.set(pkg, typesOf(pkg));
      const have = cache.get(pkg);
      if (!have) { unchecked.add(pkg); continue; }
      for (const raw of m[1].split(",")) {
        const n = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
        if (n && !have.has(n)) missing.push(`${f}: ${pkg} → ${n}`);
      }
    }
  }
  check("패키지에서 가져오는 이름이 전부 있다", missing.length === 0, missing.join(", "));
  if (unchecked.size) console.log("  (타입 선언을 못 읽어 건너뜀: " + [...unchecked].join(", ") + ")");
}

/* ── ④ 색표가 웹과 같은지 ──
   앱의 theme.js 와 웹의 CSS 변수는 같은 값이어야 한다. 어긋나면 두 화면이
   다른 제품처럼 보이는데, 눈으로 비교하지 않으면 아무도 모른다. */
{
  const css = fs.readFileSync(path.join(DIR, "../src/index.template.html"), "utf8");
  const cssVars = mode => {
    /* :root 가 라이트, prefers-color-scheme: dark 블록부터가 다크 */
    const block = mode === "dark" ? css.slice(css.indexOf("prefers-color-scheme: dark"))
                                  : css.slice(css.indexOf(":root"));
    const out = {};
    for (const m of block.matchAll(/--c-([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g))
      if (!(m[1] in out)) out[m[1]] = m[2].toLowerCase();
    return out;
  };
  const theme = await import(path.join(APP, "src/theme.js"));
  const KEYS = { ground: "ground", field: "field", fg: "fg", dim: "dim", line: "line",
                 signal: "signal", drift: "drift", moss: "moss", dust: "dust", bad: "bad",
                 signalT: "signal-t", driftT: "drift-t", mossT: "moss-t" };
  const diff = [];
  for (const [mode, tbl] of [["light", theme.LIGHT], ["dark", theme.DARK]]) {
    const v = cssVars(mode);
    for (const [k, cssKey] of Object.entries(KEYS))
      if (v[cssKey] && v[cssKey] !== String(tbl[k]).toLowerCase())
        diff.push(`${mode}.${k}: 앱 ${tbl[k]} ≠ 웹 ${v[cssKey]}`);
  }
  check("앱 색표 = 웹 CSS 변수", diff.length === 0, diff.join(", "));
}

/* ── ⑤ 소리 ── */
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
