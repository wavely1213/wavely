/* Skia 어댑터 검사 — 같은 그림을 Canvas2D 와 Skia 로 그려 픽셀로 맞춰 본다.

   앱은 코어의 그리기 코드를 그대로 쓴다. 그러니 "앱에서도 같아 보이는가" 는
   눈이 아니라 숫자로 답해야 한다. react-native-skia 는 canvaskit-wasm 위에서
   node 로도 돌아가므로 기기 없이 검증할 수 있다.

   준비: cd game/app && npm install   (없으면 이 검사는 건너뛴다)

   실행: node game/test/skia2d.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/* 두 패키지는 앱(game/app)의 의존성이다. 검사만을 위해 저장소 루트에 심지 않는다. */
const appRequire = createRequire(path.join(DIR, "../app/package.json"));
let CanvasKitInit, JsiSkApi, ckPath;
try {
  ckPath = appRequire.resolve("canvaskit-wasm/bin/full/canvaskit.js");
  CanvasKitInit = appRequire("canvaskit-wasm/bin/full/canvaskit.js");
  ({ JsiSkApi } = appRequire("@shopify/react-native-skia/lib/commonjs/skia/web"));
} catch {
  console.log("건너뜀 — game/app 에서 npm install 을 먼저 실행할 것");
  process.exit(0);
}

const { chromium } = await import("/opt/node22/lib/node_modules/playwright/index.mjs");

/* 시스템 폰트 하나. CanvasKit 웹 빌드에는 FontMgr.System() 이 없다(네이티브에는 있다). */
const TTF = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/etc/alternatives/fonts-japanese-gothic.ttf"]
  .find(p => fs.existsSync(p));

/* skia/types/Image 의 열거형 값 */
const RGBA_8888 = 4, UNPREMUL = 3;

const DARK = { ground: "#0f0f0e", field: "#141413", fg: "#f0eee6", dim: "#8a8880", line: "#2a2a28",
               signal: "#d97757", drift: "#6a9bcc", moss: "#94ab72", dust: "#b0aea5", bad: "#c2554d" };

/* 검사할 장면 — 코어의 그리기 함수를 좌표까지 똑같이 부른다.
   양쪽에서 같은 문자열을 평가하므로 두 코드가 어긋날 수 없다. */
const N = 160;
const SCENES = [
  { name: "기체 4종", w: N * 4, h: N,
    code: `["grail","bore","whim","cage"].forEach((id,i)=>drawFrame(g,id,${N}*i+${N / 2},${N / 2},4.2,C.signal))` },
  { name: "도장별 그레일", w: N * 4, h: N,
    code: `SKINS.forEach((k,i)=>drawFrame(g,"grail",${N}*i+${N / 2},${N / 2},4.2,k.col(),k.col2&&k.col2()))` },
  /* 군체는 Path2D 캐시 · 공유 그라디언트 · 클립을 한꺼번에 지난다 — 어댑터에서 가장 위험한 경로 */
  { name: "군체 4종", w: N * 4, h: 90,
    code: `["drone","weaver","turret","rusher"].forEach((k,i)=>{
             mkEnemy(k, ${N}*i+${N / 2}, 45, 1); drawEnemy(G.enemies[i]);
           })` },
  { name: "군체 손상 상태", w: N * 4, h: 90,
    code: `["drone","weaver","turret","rusher"].forEach((k,i)=>{
             mkEnemy(k, ${N}*i+${N / 2}, 45, .3); drawEnemy(G.enemies[i]);
           })` },
  /* 보스는 방사 그라디언트(동심원 두 개)를 쓴다 */
  { name: "보스 코어", w: 320, h: 320,
    code: `mkBoss(160, 150); drawBoss(G.boss)` },
  /* 타이틀 프리뷰. 「잔향」 궤적은 난수를 안 써서 양쪽이 완전히 같은 그림이 된다 */
  { name: "기체 프리뷰(잔향)", w: 240, h: 240,
    code: `S.trail = "echo"; resetShipPreview(); drawShipPreview(g, 240, 240, 0)` },
];

/* 두 엔진에서 똑같이 부를 수 있도록, 난수를 안 쓰는 엔티티 생성기를 심는다 */
const HELPERS = `
  function mkEnemy(kind, x, y, hpRatio) {
    const e = { x, y, t: 0, r: 13, kind, shootT: 1, x0: x, ph: 0, amp: 26,
                flash: 0, dmgX: 2, dmgY: -1, hp: 40 * hpRatio, maxHp: 40, vy: 100, score: 100 };
    G.enemies.push(e); return e;
  }
  function mkBoss(x, y) {
    G.boss = { x, y, r: 62, t: 1.2, spin: .6, warn: 0, entered: true, dead: false,
               hp: 700, maxHp: 1000, dieT: 0, flash: 0 };
    return G.boss;
  }
`;

/* ── Skia 쪽 ── */
global.CanvasKit = await CanvasKitInit({ locateFile: f => appRequire.resolve("canvaskit-wasm/bin/full/" + f) });
const Skia = JsiSkApi(global.CanvasKit);
const { Skia2D, makePath2D } = await import(path.join(DIR, "../src/native/skia2d.js"));
const core = await import(path.join(DIR, "../src/core/index.js"));

const tf = TTF && Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(new Uint8Array(fs.readFileSync(TTF))));
const fcache = new Map();
const fontFor = spec => {
  let f = fcache.get(spec);
  if (!f && tf) { const m = /(\d+(?:\.\d+)?)px/.exec(spec); f = Skia.Font(tf, m ? parseFloat(m[1]) : 10); fcache.set(spec, f); }
  return f;
};

core.setColors(DARK);
core.setHost({ storage: { get: () => null, set: () => {} }, Path2D: makePath2D(Skia), fontFamily: "sans-serif" });
core.loadSave();

function renderSkia(scene) {
  const surface = Skia.Surface.MakeOffscreen(scene.w, scene.h);
  const sc = surface.getCanvas();
  const g = new Skia2D(Skia, sc, fontFor);
  core.setCtx(g);
  const bg = Skia.Paint(); bg.setColor(Skia.Color(DARK.field));
  sc.drawRect(Skia.XYWHRect(0, 0, scene.w, scene.h), bg);
  core.G.enemies.length = 0; core.G.boss = null; core.G.t = 3;
  core.S.trail = "ember";
  new Function("g", "C", "G", "S", "SKINS", "drawFrame", "drawEnemy", "drawBoss", "drawShipPreview", "resetShipPreview", HELPERS + scene.code)(
    g, core.C, core.G, core.S, core.SKINS, core.drawFrame, core.drawEnemy, core.drawBoss,
    core.drawShipPreview, core.resetShipPreview);
  return Buffer.from(surface.makeImageSnapshot().readPixels(0, 0, {
    width: scene.w, height: scene.h,
    colorType: RGBA_8888, alphaType: UNPREMUL
  }));
}

/* ── Canvas2D 쪽 ── */
const browser = await chromium.launch();
const page = await browser.newPage({ colorScheme: "dark" });
await page.goto("file://" + path.join(DIR, "../index.html"));
await page.waitForTimeout(500);

async function renderCanvas(scene) {
  const arr = await page.evaluate(({ w, h, code, field, helpers }) => {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const g = cv.getContext("2d");
    g.fillStyle = field; g.fillRect(0, 0, w, h);
    G.enemies.length = 0; G.boss = null; G.t = 3; S.trail = "ember";
    /* 웹 번들에서 drawEnemy/drawBoss 는 모듈 ctx 를 쓴다 — 임시로 갈아 끼운다 */
    setCtx(g);
    try {
      new Function("g", "C", "G", "S", "SKINS", "drawFrame", "drawEnemy", "drawBoss", "drawShipPreview", "resetShipPreview", helpers + code)(
        g, C, G, S, SKINS, drawFrame, drawEnemy, drawBoss, drawShipPreview, resetShipPreview);
    } finally { setCtx(document.getElementById("cv").getContext("2d")); }
    return Array.from(g.getImageData(0, 0, w, h).data);
  }, { w: scene.w, h: scene.h, code: scene.code, field: DARK.field, helpers: HELPERS });
  return Buffer.from(arr);
}

/* ── 비교 ── */
const fails = [], ok = [];
for (const scene of SCENES) {
  const a = renderSkia(scene), b = await renderCanvas(scene);
  let diff = 0, worst = 0;
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
    if (d > 24) diff++;                       /* 안티에일리어싱 차이는 여기서 걸러진다 */
    if (d > worst) worst = d;
  }
  const total = a.length / 4;
  const pct = diff / total * 100;
  /* 두 엔진의 안티에일리어싱·감마가 달라 완전 일치는 나올 수 없다.
     형태가 어긋나면 수십 %가 뜨므로 2% 를 경계로 둔다. */
  (pct < 2 ? ok : fails).push(`${scene.name} — 어긋난 픽셀 ${pct.toFixed(2)}% (최대 채널차 ${worst})`);
}

await browser.close();
for (const n of ok) console.log("  통과  " + n);
for (const n of fails) console.log("  실패  " + n);
console.log(`\n${ok.length} 통과 / ${fails.length} 실패`);
process.exit(fails.length ? 1 : 0);
