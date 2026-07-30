/* 앱 화면을 실제로 그려 본다 — 기기 없이.

   바벨을 통과한다고 도는 건 아니다. 훅 순서, 없는 프로퍼티, 잘못된 상태 전이는
   렌더해 봐야 나온다. 네이티브 모듈만 최소한으로 흉내 내고 나머지는 진짜 코드다
   (App · Hangar · ui · host.native · 그리고 game/src/core 전부).

   무엇을 흉내 내는가
     react-native            View·Text·Pressable 같은 호스트 컴포넌트와 훅
     @shopify/react-native-skia  캔버스 대신 기록만 남기는 스텁
     reanimated · expo-*     최소 동작
   무엇이 진짜인가
     코어 전부 · 앱 컴포넌트 전부 · 흐름 · 격납고 규칙

   실행: node game/test/app-render.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import Module from "node:module";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(DIR, "../app");
const fails = [], ok = [];
const check = (n, c, d) => (c ? ok : fails).push(n + (c ? "" : " — " + d));

if (!fs.existsSync(path.join(APP, "node_modules", "react-test-renderer"))) {
  console.log("건너뜀 — game/app 에서 npm install 을 먼저 실행할 것");
  process.exit(0);
}
const appRequire = createRequire(path.join(APP, "package.json"));
const babel = appRequire("@babel/core");
const preset = appRequire.resolve("babel-preset-expo");

/* ── .jsx / ESM 을 require 로 읽을 수 있게 ──
   코어(game/src)는 앱 바깥이라 @babel/runtime 을 못 찾는다. 거기는 모듈 문법만 바꾼다. */
const CJS = appRequire.resolve("@babel/plugin-transform-modules-commonjs");
const CORE = path.resolve(DIR, "../src");
const compile = (m, filename) => {
  const inCore = filename.startsWith(CORE);
  const { code } = babel.transformSync(fs.readFileSync(filename, "utf8"), {
    filename, babelrc: false, configFile: false,
    presets: inCore ? [] : [preset],
    plugins: inCore ? [CJS] : [],
    caller: { name: "test", supportsStaticESM: false },
  });
  m._compile(code, filename);
};
const EXT = Module._extensions;
EXT[".jsx"] = compile;
const jsCompile = EXT[".js"];
EXT[".js"] = (m, f) => (f.includes("node_modules") ? jsCompile : compile)(m, f);

/* React 에게 act() 안이라고 알려 준다 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/* 게임 루프는 requestAnimationFrame 으로 돈다 — node 에는 없으니 타이머로 흉내 낸다.
   16ms 마다 진짜로 update(dt) + draw() 가 돌므로, 렌더뿐 아니라 루프도 같이 검사된다. */
{
  let id = 0;
  const live = new Map();
  globalThis.requestAnimationFrame = cb => {
    const k = ++id;
    live.set(k, setTimeout(() => { live.delete(k); cb(performance.now()); }, 16));
    return k;
  };
  globalThis.cancelAnimationFrame = k => { clearTimeout(live.get(k)); live.delete(k); };
}

/* ── 네이티브 모듈 흉내 ── */
const React = appRequire("react");
const h = React.createElement;

const host = tag => {
  const C = React.forwardRef((props, ref) => h(tag, { ...props, ref }));
  C.displayName = tag;
  return C;
};

const RN = {
  View: host("View"), Text: host("Text"), Pressable: host("Pressable"),
  ScrollView: host("ScrollView"), Image: host("Image"),
  useColorScheme: () => RN.__scheme,
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
  AppState: { addEventListener: () => ({ remove() {} }), currentState: "active" },
  AccessibilityInfo: { isReduceMotionEnabled: async () => false },
  Platform: { OS: "ios", select: o => o.ios ?? o.default },
  StyleSheet: { create: o => o, flatten: o => o },
  __scheme: "dark",
};

const skiaCanvas = () => ({
  save() {}, restore() {}, translate() {}, scale() {}, rotate() {}, concat() {},
  drawPath() {}, drawRect() {}, drawCircle() {}, drawOval() {}, drawText() {}, clipPath() {},
});
const paint = () => ({
  setAntiAlias() {}, setStyle() {}, setColor() {}, setAlphaf() {}, setShader() {},
  setStrokeWidth() {}, setBlendMode() {},
});
const skPath = () => { const p = { moveTo: () => p, lineTo: () => p, close: () => p, addOval: () => p, arcToOval: () => p }; return p; };
let recorded = 0;
const Skia = {
  Paint: paint,
  Path: { Make: skPath },
  PictureRecorder: () => ({ beginRecording: skiaCanvas, finishRecordingAsPicture: () => { recorded++; return { __picture: true }; } }),
  XYWHRect: (x, y, w, h) => ({ x, y, width: w, height: h }),
  Color: () => Float32Array.of(0, 0, 0, 1),
  Shader: { MakeLinearGradient: () => ({}), MakeRadialGradient: () => ({}) },
  FontMgr: { System: () => ({ getFamilyName: () => "Sys", matchFamilyStyle: () => ({}) }) },
  Font: () => ({ getGlyphWidths: t => t.map(() => 6), getGlyphIDs: t => [...t].map(() => 1), getMetrics: () => ({ ascent: -8, descent: 2 }) }),
};

const STUBS = {
  "react-native": RN,
  "@shopify/react-native-skia": { Skia, Canvas: host("SkCanvas"), Picture: host("SkPicture") },
  "react-native-reanimated": { useSharedValue: v => ({ value: v }) },
  "react-native-safe-area-context": { SafeAreaProvider: host("SafeAreaProvider"), SafeAreaView: host("SafeAreaView") },
  "expo-status-bar": { StatusBar: host("StatusBar") },
  "expo-keep-awake": { activateKeepAwakeAsync: async () => {}, deactivateKeepAwake: async () => {} },
  "expo-haptics": { notificationAsync: async () => {}, impactAsync: async () => {}, NotificationFeedbackType: { Warning: 0 }, ImpactFeedbackStyle: { Heavy: 0 } },
  "expo-audio": { createAudioPlayer: () => ({ play() {}, pause() {}, seekTo: async () => {}, remove() {}, volume: 1 }), setAudioModeAsync: async () => {} },
  "expo-file-system": { Paths: { cache: "/tmp" }, File: class { constructor() { this.exists = true; this.uri = "file:///tmp/x.wav"; } create() {} writeBytes() {} } },
  "@react-native-async-storage/async-storage": (() => { const m = new Map(); return { getItem: async k => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v) }; })(),
};

const origLoad = Module._load;
Module._load = function (req, parent, isMain) {
  if (req in STUBS) return STUBS[req];
  return origLoad.call(this, req, parent, isMain);
};

/* ── 렌더 ── */
const renderer = appRequire("react-test-renderer");
const { act } = renderer;
const require2 = createRequire(path.join(APP, "App.jsx"));
const App = require2("./App.jsx").default;

const wait = ms => new Promise(r => setTimeout(r, ms));

/* 트리에서 글자로 컴포넌트를 찾는다 — 화면에 뭐가 보이는지로 확인하는 것이 목적이다 */
const texts = tree => {
  const out = [];
  const walk = n => {
    if (n == null) return;
    if (typeof n === "string") { out.push(n); return; }
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.children) n.children.forEach(walk);
  };
  walk(tree.toJSON());
  return out;
};
/* 글자는 노드 여러 개로 쪼개져 나온다 — 이어 붙여서 본다 */
const has = (tree, s) => texts(tree).join("").includes(s);

/* 테스트 인스턴스 아래의 글자를 모은다 */
const textUnder = inst => {
  const out = [];
  const walk = n => {
    if (n == null) return;
    if (typeof n === "string") { out.push(n); return; }
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.props && n.props.children !== undefined) walk(n.props.children);
    if (n.children) n.children.forEach(walk);
  };
  walk(inst.props.children);
  return out.join("");
};

const pressableWith = (tree, label) => {
  const all = tree.root.findAll(n => n.type === "Pressable" && textUnder(n).includes(label), { deep: true });
  if (!all.length) throw new Error(`「${label}」 버튼을 못 찾았다`);
  return all.at(-1);                       /* 가장 안쪽(잎에 가까운) 것 */
};

/* 글자가 정확히 일치하는 것만 — 「기록」 탭과 「기록 초기화」 버튼처럼 서로를 포함할 때 쓴다 */
const pressableExact = (tree, label) => {
  const all = tree.root.findAll(n => n.type === "Pressable" && textUnder(n).trim() === label, { deep: true });
  if (!all.length) throw new Error(`「${label}」 버튼(정확히)을 못 찾았다`);
  return all.at(-1);
};

let tree;
const errs = [];
const origErr = console.error;
/* react-test-renderer 자체의 폐기 예고는 우리 코드의 문제가 아니다 */
const NOISE = /react-test-renderer is deprecated/;
console.error = (...a) => { const m = a.join(" "); if (!NOISE.test(m)) { errs.push(m); origErr(...a); } };

await act(async () => { tree = renderer.create(h(App)); });
await act(async () => { await wait(60); });     /* bootCore 완료 대기 */

check("부팅 후 타이틀", has(tree, "출격") && has(tree, "격납고"), texts(tree).slice(0, 12).join("|"));
check("현재 편성 표시", has(tree, "P-01") && has(tree, "TR-04"), texts(tree).join("|").slice(0, 120));
check("렌더 중 콘솔 오류 없음", errs.length === 0, errs.join(" | "));

/* 격납고 왕복 */
await act(async () => { pressableWith(tree, "격납고").props.onPress(); });
check("격납고 진입", has(tree, "탑승자") && has(tree, "스트레이"), texts(tree).slice(0, 14).join("|"));
for (const tab of ["기체", "장비", "치장", "기록"]) {
  await act(async () => { pressableExact(tree, tab).props.onPress(); });
  check(`격납고 · ${tab}`, texts(tree).length > 5, "탭 내용 없음");
}
/* 기록 탭이 웹과 같은 내용을 담는가 — 항행 기록 · 조우 기록 · 최고 기록 · 초기화 */
{
  await act(async () => { pressableExact(tree, "기록").props.onPress(); });
  check("기록 탭 구성",
    has(tree, "항행 기록") && has(tree, "조우 기록") && has(tree, "최고") && has(tree, "기록 초기화"),
    texts(tree).join("|").slice(0, 160));

  /* 초기화는 두 번 눌러야 지워진다 */
  const core = require2("../src/core/index.js");
  core.S.coins = 500; core.S.best = 9999; core.S.sound = false;
  await act(async () => { pressableExact(tree, "기록 초기화").props.onPress(); });
  check("초기화 1단계는 경고만", core.S.coins === 500 && has(tree, "한 번 더"), "코어 " + core.S.coins);
  await act(async () => { pressableWith(tree, "한 번 더").props.onPress(); });
  check("초기화 2단계에서 지운다", core.S.coins === 0 && core.S.best === 0, `코어 ${core.S.coins} 최고 ${core.S.best}`);
  check("소리 설정은 남는다", core.S.sound === false, "sound " + core.S.sound);
  core.S.sound = true;
}

await act(async () => { pressableWith(tree, "닫기").props.onPress(); });
check("격납고 → 타이틀", has(tree, "출격"), texts(tree).slice(0, 10).join("|"));

/* 출격 → 스토리 → 전투 */
await act(async () => { pressableWith(tree, "출격").props.onPress(); });
check("스토리 진입", has(tree, "STAGE 1"), texts(tree).slice(0, 10).join("|"));
await act(async () => { pressableWith(tree, "출격").props.onPress(); });
await act(async () => { await wait(120); });
check("전투 진입", has(tree, "BOMB"), texts(tree).slice(0, 14).join("|"));

/* 필드 크기는 계산이 아니라 측정으로 정해진다 — onLayout 이 실제로 반영되는가.
   기기마다 머리말·안전영역 높이가 달라서, 빼기로 잡으면 태블릿에서 하단이 눌린다. */
{
  const field = tree.root.findAll(n => n.type === "View" && typeof n.props.onLayout === "function", { deep: true }).at(-1);
  check("필드가 onLayout 을 단다", !!field, "onLayout 붙은 View 없음");
  /* GameField 의 뿌리 View — 명시적인 width/height 를 가진 것 */
  const sizeOf = () => {
    const v = tree.root.findAll(n => n.type === "View" && n.props.style
      && typeof n.props.style.width === "number" && typeof n.props.style.height === "number"
      && n.props.onStartShouldSetResponder, { deep: true }).at(-1);
    return v ? [v.props.style.width, v.props.style.height] : null;
  };
  const before = sizeOf();
  await act(async () => {
    field.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 900, height: 1200 } } });
  });
  await act(async () => { await wait(40); });
  const after = sizeOf();
  check("잰 크기가 필드에 반영된다", after && after[1] > (before ? before[1] : 0),
    `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
  /* 480×720 비율은 유지돼야 한다 */
  check("필드 비율 유지", after && Math.abs(after[0] / after[1] - 480 / 720) < .02,
    after ? `${after[0]}×${after[1]}` : "없음");
}

/* 루프가 실제로 도는가 — 렌더만 되고 세계가 멈춰 있으면 화면은 멀쩡해 보인다 */
{
  const core = require2("../src/core/index.js");
  const t0 = core.G.t, drawn0 = recorded;
  /* 첫 웨이브는 0.6+1.1초 뒤에 선다 — 그걸 넘겨야 군체가 실제로 나온다 */
  await act(async () => { await wait(2500); });
  check("전투 중 세계가 흐른다", core.G.t > t0 + .1, `G.t ${t0.toFixed(2)} → ${core.G.t.toFixed(2)}`);
  check("매 프레임 그림이 갱신된다", recorded > drawn0 + 5, `picture ${drawn0} → ${recorded}`);
  check("군체가 나온다", core.G.enemies.length + core.G.queue.length + core.G.kills > 0,
    `적 ${core.G.enemies.length} 대기 ${core.G.queue.length} 킬 ${core.G.kills} phase ${core.G.phase}`);

  /* 폭탄 버튼이 실제로 소모하는가 */
  const b0 = core.G.player.bomb;
  if (b0 > 0) {
    await act(async () => { pressableWith(tree, "BOMB").props.onPress(); });
    check("폭탄 버튼", core.G.player.bomb === b0 - 1, `${b0} → ${core.G.player.bomb}`);
  } else check("폭탄 버튼", true, "");
}

/* 정지 → 계속 → 중단 → 결과 */
await act(async () => { pressableWith(tree, "II").props.onPress(); });
check("정지 화면", has(tree, "계속") && has(tree, "출격 중단"), texts(tree).slice(0, 14).join("|"));
await act(async () => { pressableWith(tree, "출격 중단").props.onPress(); });
await act(async () => { await wait(900); });
check("결과 화면", has(tree, "회수 보고") && has(tree, "재출격"), texts(tree).slice(0, 14).join("|"));

check("전체 흐름 중 콘솔 오류 없음", errs.length === 0, errs.join(" | "));
check("Skia 그림이 실제로 기록됐다", recorded > 0, "picture " + recorded + "장");

/* 격납고에서 산 것이 저장에 남는가 */
{
  const core = require2("../src/core/index.js");
  core.S.coins = 2000; core.S.cleared = 5;
  await act(async () => { pressableWith(tree, "격납고로").props.onPress(); });
  await act(async () => { pressableWith(tree, "격납고").props.onPress(); });
  await act(async () => { pressableWith(tree, "기체").props.onPress(); });
  const before = core.S.frame, coins = core.S.coins;
  const target = core.FRAMES.find(f => f.id !== before && !core.S.owned.includes(f.id));
  await act(async () => { pressableWith(tree, String(target.cost)).props.onPress(); });
  check("격납고 구매가 반영된다",
    core.S.frame === target.id && core.S.coins === coins - target.cost && core.S.owned.includes(target.id),
    `${before} → ${core.S.frame} / 코어 ${coins} → ${core.S.coins}`);
}

/* 라이트 테마도 그려지는가 */
{
  RN.__scheme = "light";
  let t2;
  await act(async () => { t2 = renderer.create(h(App)); });
  await act(async () => { await wait(80); });
  check("라이트 테마 렌더", has(t2, "출격"), texts(t2).slice(0, 10).join("|"));
  await act(async () => { t2.unmount(); });
  RN.__scheme = "dark";
}

await act(async () => { tree.unmount(); });
console.error = origErr;

for (const n of ok) console.log("  통과  " + n);
for (const n of fails) console.log("  실패  " + n);
console.log(`\n${ok.length} 통과 / ${fails.length} 실패`);
process.exit(fails.length ? 1 : 0);
