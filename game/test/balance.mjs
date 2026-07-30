/* 밸런스 측정 — 자동 조종으로 여러 판을 돌려 경제·콤보 지표를 낸다.

   검사(pass/fail)가 아니라 **측정 도구**다. 수치가 흔들렸는지 보고 판단은 사람이 한다.
   DESIGN_GUIDE 5장의 밸런스 기준선이 이 스크립트에서 나온다.

   ⚠️ 봇은 사람보다 잘 산다(위협 회피 + 최근접 조준 + 위험 시 폭탄).
   **난이도를 이 숫자로 맞추면 안 된다.** 경제·콤보 같은 수치 지표에만 쓴다.
   특히 「육각 차폐」처럼 생존에 기여하는 부가효과는 봇이 거의 안 죽어서 측정되지 않는다.

   실행:
     node game/test/balance.mjs             # 기본 (장비 LV 1·3·5 × 12판)
     node game/test/balance.mjs --progress  # 새 계정이 전부 여는 데 몇 판 걸리나
     node game/test/balance.mjs --frames    # 기체 4종 비교
     node game/test/balance.mjs --econ      # 전체 해금 비용
*/
import {
  setHost, loadSave, S, G, P, MAXLV, PILOTS, FRAMES, SKINS, TRAILS, EQUIP,
  newPlayer, stats, update, upCost, beginRun, armStage, finishStage, finishRun,
  W, H, dist2,
} from "../src/core/index.js";

const mem = new Map();
let over = false;
setHost({
  storage: { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) },
  runEnded: () => { over = true; },
  stageCleared: () => { finishStage(); armStage(); },
});
loadSave();

/* ── 자동 조종 ──────────────────────────────────
   위협을 거리로 보면 늦는다. **닿기까지 남은 시간**으로 봐야 피할 시간이 남는다.
   ① 곧 닿을 탄·돌입기를 찾아 옆으로 빠진다
   ② 없으면 최근접 적 아래로 붙어 쏜다
   ③ 둘러싸였거나 내구가 마지막이면 폭탄 */
const TTI = (b, p) => {
  /* 상대 속도로 최근접 시점까지의 시간. 멀어지는 중이면 Infinity */
  const dx = b.x - p.x, dy = b.y - p.y;
  const vx = (b.vx || 0), vy = (b.vy || 0);
  const vv = vx * vx + vy * vy;
  if (vv < 1) return Infinity;
  const t = -(dx * vx + dy * vy) / vv;
  if (t < 0) return Infinity;
  const mx = dx + vx * t, my = dy + vy * t;
  const miss = Math.hypot(mx, my);
  return miss > 40 ? Infinity : t;      /* 빗나갈 탄은 무시한다 */
};

function autopilot() {
  const p = G.player;
  if (!p || p.dead) return;

  let threat = null, tt = 1e9;
  for (const b of G.ebullets) { const t = TTI(b, p); if (t < tt) { tt = t; threat = b; } }
  for (const e of G.enemies) {
    if (e.kind === "rusher" && e.aim) { const t = TTI({ ...e, vx: e.aim.vx, vy: e.aim.vy }, p); if (t < tt) { tt = t; threat = e; } }
    else if (Math.hypot(e.x - p.x, e.y - p.y) < 60) { tt = Math.min(tt, .25); threat = threat || e; }
  }

  if (threat && tt < .55) {
    /* 옆으로 빠진다 — 벽에 몰리면 반대쪽 */
    const away = p.x < threat.x ? -1 : 1;
    let tx = p.x + away * 110;
    if (tx < 45 || tx > W - 45) tx = p.x - away * 110;
    P.tx = tx;
    P.ty = H - 100;                     /* 아래에 있을수록 반응할 시간이 는다 */
  } else {
    let near = null, nd = 1e9;
    for (const e of G.enemies) { const d = e.y > p.y - 20 ? 1e9 : dist2(e.x, e.y, p.x, p.y); if (d < nd) { nd = d; near = e; } }
    if (G.boss && G.boss.entered && !G.boss.dead) near = G.boss;
    P.tx = near ? near.x : W / 2;
    P.ty = H - 130;
  }
  P.tx = Math.max(30, Math.min(W - 30, P.tx));
  P.active = true;

  /* 사방이 막혔거나 마지막 내구면 쓸어낸다 */
  const near = G.ebullets.filter(b => dist2(b.x, b.y, p.x, p.y) < 160 ** 2).length;
  if (p.bomb > 0 && (near >= 5 || (p.hp <= 1 && near >= 2))) import.meta.__useBomb();
}

/* useBomb 은 G.screen 을 본다 — 시뮬레이션은 항상 전투 중이다 */
const { useBomb } = await import("../src/core/index.js");
import.meta.__useBomb = () => { G.screen = "play"; useBomb(); };

/* ── 한 판 ── */
function simRun(stage = 1, { eq = 1, pilot = "stray", frame = "grail", maxSec = 240, useSave = false } = {}) {
  if (!useSave) {
    /* 지정한 조건으로 고정해 잰다 */
    S.eq = { weapon: eq, engine: eq, shield: eq };
    S.pilot = pilot; S.frame = frame;
    S.cleared = 99;                     /* 해금 제한 없이 */
  }
  beginRun(stage); armStage();
  G.screen = "play";
  over = false;

  const N = Math.round(maxSec * 60);
  for (let i = 0; i < N && !over; i++) { autopilot(); update(1 / 60); }
  const r = { stage: G.stage, coins: G.coins, kills: G.kills, score: G.score, combo: G.maxCombo, sec: +(G.t).toFixed(0) };
  finishRun();
  return r;
}

const avg = (a, k) => Math.round(a.reduce((s, x) => s + x[k], 0) / a.length);
const many = (n, opt) => Array.from({ length: n }, () => simRun(1, opt));

/* ── 전체 해금 비용 ── */
function unlockCost() {
  let eq = 0;
  for (const _ of EQUIP) for (let lv = 1; lv < MAXLV; lv++) eq += upCost(lv);
  const items = [...PILOTS, ...FRAMES, ...SKINS, ...TRAILS].reduce((s, x) => s + (x.cost || 0), 0);
  return { eq, items, total: eq + items };
}

/* ── 진행 시뮬레이션 ──────────────────────────
   「장비 LV1 로 반복하면 N판」 같은 계산은 현실을 오해한다 — 아무도 LV1 로 갈지 않는다.
   한 판 돌고 → 번 코어를 쓰고 → 다시 돈다. 그게 실제로 걸리는 판수다.
   쓰는 순서는 사람이 할 법한 대로: 장비를 싼 것부터 올리고, 남으면 탑승자·기체, 마지막에 치장. */
function simProgress(maxRuns = 200) {
  S.coins = 0; S.best = 0; S.cleared = 0;
  S.eq = { weapon: 1, engine: 1, shield: 1 };
  S.owned = ["std", "ember", "stray", "grail"];
  S.pilot = "stray"; S.frame = "grail"; S.skin = "std"; S.trail = "ember";

  const goal = unlockCost().total;
  const marks = {};
  let spent = 0, runs = 0;

  const buyables = () => [
    ...EQUIP.filter(e => S.eq[e.id] < MAXLV).map(e => ({ kind: "eq", id: e.id, cost: upCost(S.eq[e.id]), pri: 0 })),
    ...[...PILOTS, ...FRAMES].filter(x => !S.owned.includes(x.id)).map(x => ({ kind: "unit", id: x.id, cost: x.cost, need: x.need, pri: 1 })),
    ...[...SKINS, ...TRAILS].filter(x => !S.owned.includes(x.id)).map(x => ({ kind: "cos", id: x.id, cost: x.cost, need: x.need, pri: 2 })),
  ].filter(b => !b.need || S.cleared >= b.need);

  while (runs < maxRuns && spent < goal) {
    /* 저장 상태 그대로 한 판 — 슬롯별 레벨과 장착이 유지돼야 진행이 쌓인다 */
    const r = simRun(1, { useSave: true });
    S.coins += r.coins;
    S.cleared = Math.max(S.cleared, r.stage - 1);
    runs++;

    /* 살 수 있는 것 중 우선순위 → 싼 것 순으로 계속 산다 */
    for (;;) {
      const b = buyables().filter(x => x.cost <= S.coins).sort((a, b2) => a.pri - b2.pri || a.cost - b2.cost)[0];
      if (!b) break;
      S.coins -= b.cost; spent += b.cost;
      if (b.kind === "eq") S.eq[b.id]++;
      else S.owned.push(b.id);
    }
    if (!marks.eqMax && EQUIP.every(e => S.eq[e.id] === MAXLV)) marks.eqMax = runs;
    if (!marks.units && [...PILOTS, ...FRAMES].every(x => S.owned.includes(x.id))) marks.units = runs;
  }
  return { runs, spent, goal, marks, cleared: S.cleared };
}

const arg = process.argv.slice(2);
const line = (a, ...b) => console.log(String(a).padEnd(26) + b.map(v => String(v).padStart(9)).join(""));

if (arg.includes("--econ") || arg.length === 0) {
  const c = unlockCost();
  console.log("\n── 전체 해금 비용");
  line("장비 3슬롯 × 5레벨", c.eq);
  line("탑승자·기체·치장", c.items);
  line("합계", c.total);
}

if (arg.includes("--progress")) {
  console.log("\n── 새 계정이 전부 여는 데 (5회 평균)");
  const rs = Array.from({ length: 5 }, () => simProgress());
  const m = k => Math.round(rs.reduce((s2, r) => s2 + (typeof k === "function" ? k(r) : r[k]), 0) / rs.length);
  line("장비 만렙까지", m(r => r.marks.eqMax || 0) + "판");
  line("탑승자·기체 전부", m(r => r.marks.units || 0) + "판");
  line("치장까지 전부", m("runs") + "판");
  line("돌파한 최고 구역", m("cleared"));
}

if (arg.includes("--frames")) {
  console.log("\n── 기체별 (장비 LV3 · 스트레이 · 각 10판)");
  line("기체", "도달", "점수", "처치", "코어");
  for (const f of FRAMES) {
    const r = many(10, { eq: 3, frame: f.id });
    line(`${f.desig} ${f.nm}`, avg(r, "stage"), avg(r, "score"), avg(r, "kills"), avg(r, "coins"));
  }
} else if (!arg.includes("--progress")) {
  console.log("\n── 장비 레벨별 (각 12판 · 최대 240초)");
  line("장비 LV", "도달", "코어/판", "처치", "최대콤보", "생존초");
  const rows = [];
  for (const eq of [1, 3, 5]) {
    const r = many(12, { eq });
    rows.push({ eq, coins: avg(r, "coins") });
    line(eq, avg(r, "stage"), avg(r, "coins"), avg(r, "kills"), avg(r, "combo"), avg(r, "sec"));
  }
  const c = unlockCost();
  console.log("\n── 전체 해금까지");
  for (const r of rows) line(`장비 LV${r.eq} 로 반복하면`, Math.ceil(c.total / r.coins) + "판");
}
console.log();
