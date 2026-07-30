/* 코어 검사 — 브라우저 없이 돈다. 이게 성립한다는 것 자체가 코어/타깃 분리의 증거다.
   실행: node game/test/core.mjs   (몇 초)
*/
import {
  setHost, loadSave, S, MAXLV, PILOTS, FRAMES, SKINS,
  G, P, newPlayer, stats, update, hurt, upCost,
  beginRun, armStage, finishStage, finishRun, markTip,
  statusOf, acquire, upgrade, equipRows, maxStage, stageName, stageEn,
} from "../src/core/index.js";

const fails = [], ok = [];
const check = (n, c, d) => (c ? ok : fails).push(n + (c ? "" : " — " + d));

/* 메모리 저장소 — 코어는 localStorage 도 AsyncStorage 도 모른다 */
const mem = new Map();
let ended = 0, cleared = 0;
setHost({
  storage: { get: k => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) },
  runEnded: () => ended++,
  stageCleared: () => { cleared++; G.stage++; G.wave = 0; G.phase = "gap"; G.waveT = 0; G.boss = null; G.enemies.length = 0; }
});

/* ── 저장 데이터 ── */
loadSave();
check("기본 저장", S.pilot === "stray" && S.frame === "grail" && S.eq.weapon === 1, JSON.stringify(S.eq));

mem.set("wavelength.save.v1", JSON.stringify({ eq: { weapon: 99, engine: -3, shield: "x" }, pilot: "없음", coins: "NaN", owned: 7 }));
loadSave();
check("손상 저장 정규화",
  S.eq.weapon === MAXLV && S.eq.engine === 1 && S.eq.shield === 1 &&
  S.pilot === "stray" && S.coins === 0 && Array.isArray(S.owned),
  JSON.stringify({ eq: S.eq, pilot: S.pilot, coins: S.coins, owned: S.owned }));
mem.clear(); loadSave();

/* ── 스펙 합산: 장비 × 기체 × 탑승자 ── */
{
  const base = stats();
  S.pilot = "torch"; const fast = stats();          // 연사 125%
  S.pilot = "hollow"; const dodgy = stats();        // 회피 20%
  S.frame = "bore"; const heavy = stats();          // 공격 134%
  S.pilot = "stray"; S.frame = "grail";
  check("탑승자가 연사에 반영", fast.rate < base.rate, `${base.rate} → ${fast.rate}`);
  check("탑승자가 회피에 반영", dodgy.evade > base.evade, `${base.evade} → ${dodgy.evade}`);
  check("기체가 공격력에 반영", heavy.dmg > base.dmg, `${base.dmg} → ${heavy.dmg}`);
  check("보급품이 탑승자를 따른다", base.drop === "repair", base.drop);
}

/* ── 강화 비용은 단조 증가 ── */
{
  let mono = true;
  for (let l = 1; l < MAXLV; l++) if (upCost(l + 1) <= upCost(l)) mono = false;
  check("강화 비용 단조 증가", mono, [1, 2, 3, 4, 5].map(upCost).join(" → "));
}

/* ── 60초 무입력 시뮬레이션 ── */
{
  G.stage = 1; G.wave = 0; G.screen = "play"; G.phase = "gap"; G.waveT = 0;
  G.bullets.length = G.ebullets.length = G.enemies.length = G.parts.length = G.drops.length = 0;
  G.queue.length = 0; G.boss = null; G.kills = 0; G.coins = 0; G.over = false;
  G.player = newPlayer();
  P.active = false; P.tx = 240; P.ty = 590;
  ended = 0;
  for (let i = 0; i < 3600; i++) update(1 / 60);
  check("무입력 60초 무예외", true, "");
  check("적이 실제로 나온다", G.kills > 0, "킬 " + G.kills);
  check("런 종료는 한 번만", ended <= 1, "runEnded " + ended + "회");
}

/* ── 쓰러진 뒤의 피격은 다시 종료를 부르지 않는다 ── */
{
  G.player = newPlayer();
  G.player.hp = 1; G.player.inv = 0;
  ended = 0;
  hurt();                                    // 여기서 쓰러진다
  for (let i = 0; i < 200; i++) { G.player.inv = 0; hurt(); }
  check("사망 후 재종료 없음", ended === 1, "runEnded " + ended + "회");
}

/* ── 배열이 무한히 자라지 않는다 ── */
{
  G.player = newPlayer(); G.player.inv = 1e9;
  G.stage = 1; G.wave = 0; G.phase = "gap"; G.waveT = 0;
  G.bullets.length = G.ebullets.length = G.enemies.length = G.parts.length = G.drops.length = G.echo.length = 0;
  for (let i = 0; i < 18000; i++) update(1 / 60);      // 5분
  const sizes = { 탄: G.bullets.length, 적탄: G.ebullets.length, 파편: G.parts.length, 잔상: G.echo.length, 낙하물: G.drops.length };
  const big = Object.entries(sizes).filter(([, v]) => v > 900);
  check("5분 뒤 배열 정상", big.length === 0, JSON.stringify(sizes));
}

/* ── 런 진행 규칙 — 앱과 웹이 같은 함수로 도는 부분 ── */
{
  S.coins = 0; S.best = 0; S.cleared = 0; S.tips = [];
  beginRun(3);
  check("출격이 세계를 비운다",
    G.stage === 3 && G.score === 0 && G.coins === 0 && !G.over &&
    G.enemies.length === 0 && G.bullets.length === 0 && G.player.hp > 0,
    JSON.stringify({ stage: G.stage, over: G.over, enemies: G.enemies.length }));

  armStage();
  check("웨이브 시동", G.phase === "gap" && G.waveT > 0, `${G.phase} ${G.waveT}`);

  G.player.hp = 1; G.player.maxHp = 3; G.player.bomb = 0;
  G.coins = 100;
  const { bonus, ending } = finishStage();
  check("구역 클리어 보너스", bonus === 15 + 5 * 3 && G.coins === 100 + bonus, `+${bonus} → ${G.coins}`);
  check("클리어 시 보급", G.player.hp === 2 && G.player.bomb === stats().bomb, `내구 ${G.player.hp} 폭탄 ${G.player.bomb}`);
  check("다음 구역으로", G.stage === 4 && G.wave === 0 && !G.boss && ending === false, `stage ${G.stage}`);
  check("돌파 기록", S.cleared === 3, "cleared " + S.cleared);

  G.score = 500;
  const r1 = finishRun();
  check("런 종료 정산", r1 && r1.record && S.coins === 130 && S.best === 500,
    JSON.stringify({ r1, coins: S.coins, best: S.best }));
  check("두 번째 종료는 무시", finishRun() === null && S.coins === 130, "코어 " + S.coins);
  check("재출격 구역", G.pickStage === Math.min(4, maxStage()), "pickStage " + G.pickStage);

  check("첫 안내는 한 번만", markTip("combo") === true && markTip("combo") === false, S.tips.join(","));
}

/* ── 프레임 레이트가 달라도 같은 게임이어야 한다 ──
   앱이 붙으면서 120Hz 기기가 실사용에 들어왔다. 같은 편성이 기기에 따라
   다른 화력을 내면 안 된다. 실제로 연사가 60Hz −10.2%, 120Hz −4.4% 로 갈려 있었다. */
{
  const fireInterval = fps => {
    S.eq = { weapon: 1, engine: 1, shield: 1 };
    beginRun(1); armStage();
    G.screen = "play"; G.phase = "gap"; G.waveT = -1e6;   /* 적이 안 나오게 */
    G.player.inv = 1e9;
    let shots = 0;
    const dt = 1 / fps, N = Math.round(20 * fps);
    for (let i = 0; i < N; i++) {
      const before = G.bullets.length;
      update(dt);
      if (G.bullets.length > before) shots++;
      G.bullets.length = 0;
    }
    return 20 / shots;
  };
  const want = (S.eq = { weapon: 1, engine: 1, shield: 1 }, stats().rate);
  const got = [30, 60, 120, 144].map(f => ({ fps: f, iv: fireInterval(f) }));
  const off = got.map(g => Math.abs(g.iv / want - 1));
  check("연사 간격이 표시대로", Math.max(...off) < .02,
    got.map(g => `${g.fps}fps ${(g.iv / want * 100 - 100).toFixed(1)}%`).join(" · "));
  check("연사가 프레임 레이트를 안 탄다",
    Math.max(...got.map(g => g.iv)) / Math.min(...got.map(g => g.iv)) < 1.02,
    got.map(g => `${g.fps}fps ${g.iv.toFixed(4)}s`).join(" · "));

  /* 연출도 주사율을 타면 안 된다 — 프레임당 확률로 뿌리면 120Hz 에서 두 배가 된다 */
  const trailAfter = (fps, trail) => {
    S.trail = trail;
    beginRun(1); armStage();
    G.screen = "play"; G.phase = "gap"; G.waveT = -1e6;
    G.player.inv = 1e9;
    const dt = 1 / fps;
    for (let i = 0; i < Math.round(3 * fps); i++) update(dt);
    return trail === "echo" ? G.echo[0].t : G.parts.length;
  };
  {
    const FPS = [30, 60, 120, 144];
    /* 난수를 고정한다 — 여기서 보려는 건 "프레임 레이트에 따라 양이 달라지는가" 하나뿐이고,
       난수까지 흔들리면 어쩌다 한 번 실패하는 검사가 된다(실제로 그랬다). */
    const realRandom = Math.random;
    let seed = 12345;
    Math.random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
    let parts;
    try {
      parts = FPS.map(f => {
        let sum = 0;
        for (let k = 0; k < 8; k++) sum += trailAfter(f, "ember");
        return sum / 8;
      });
    } finally { Math.random = realRandom; }
    /* 정상값은 초당 48개 × 수명 0.3초 ≈ 14.4개 */
    check("배기 파티클이 주사율을 안 탄다", parts.every(v => v > 10 && v < 19),
      parts.map((v, i) => `${FPS[i]}fps ${v.toFixed(1)}개 (기대 14.4)`).join(" · "));

    const spans = FPS.map(f => trailAfter(f, "echo"));
    check("잔상 길이가 주사율을 안 탄다", Math.max(...spans) / Math.min(...spans) < 1.2,
      spans.map((v, i) => `${FPS[i]}fps ${v.toFixed(3)}초`).join(" · "));
    S.trail = "ember";
  }

  /* 이동도 같은 시간이면 같은 곳에 있어야 한다 */
  const moveTo = fps => {
    beginRun(1); G.screen = "play"; G.phase = "gap"; G.waveT = -1e6;
    G.player.inv = 1e9;
    P.active = true; P.tx = 100; P.ty = 200;
    const dt = 1 / fps;
    for (let i = 0; i < Math.round(.5 * fps); i++) update(dt);
    return [G.player.x, G.player.y];
  };
  const pts = [30, 60, 120, 144].map(moveTo);
  const spread = Math.max(...pts.map(a => Math.hypot(a[0] - pts[1][0], a[1] - pts[1][1])));
  check("이동이 프레임 레이트를 안 탄다", spread < 1,
    pts.map(a => `(${a[0].toFixed(1)},${a[1].toFixed(1)})`).join(" "));
}

/* ── 무한 모드 「잔향」 — 5구역 뒤로는 데이터에 없는 번호가 계속 들어온다 ── */
{
  S.cleared = 99;
  const bad = [];
  for (const st of [5, 6, 7, 11, 20, 40, 99]) {
    try {
      beginRun(st); armStage();
      G.player.inv = 1e9;
      for (let i = 0; i < 600; i++) update(1 / 60);          // 10초
      const nm = stageName(st), en = stageEn(st);
      if (!nm || !en || /undefined|NaN/.test(nm + en)) bad.push(`${st}: "${nm}" / "${en}"`);
      if (!Number.isFinite(G.player.x) || !Number.isFinite(G.player.y)) bad.push(`${st}: 좌표 NaN`);
    } catch (e) { bad.push(`${st}: ${e.message}`); }
  }
  check("잔향 구역이 끝까지 돈다", bad.length === 0, bad.join(" | "));

  beginRun(5);
  const first = finishStage();
  check("5구역 클리어가 엔딩", first.ending === true && G.stage === 6, `ending ${first.ending} stage ${G.stage}`);
  const next = finishStage();
  check("그다음은 엔딩이 아니다", next.ending === false && next.bonus > first.bonus, `${first.bonus} → ${next.bonus}`);
}

/* ── 격납고 규칙 ── */
{
  S.coins = 0; S.cleared = 0; S.owned = ["std", "ember", "stray", "grail"]; S.pilot = "stray";
  const hollow = PILOTS.find(p => p.id === "hollow");
  const anchor = PILOTS.find(p => p.id === "anchor");     /* 2구역 돌파 필요 */
  check("돈 없으면 못 산다", statusOf(hollow, S.pilot) === "poor" && acquire(hollow, "pilot") === "poor",
    statusOf(hollow, S.pilot));
  check("구역을 못 넘으면 잠김", statusOf(anchor, S.pilot) === "locked" && acquire(anchor, "pilot") === "locked",
    statusOf(anchor, S.pilot));

  S.coins = 1000;
  check("사면 바로 장착", acquire(hollow, "pilot") === "bought" && S.pilot === "hollow" && S.coins === 1000 - hollow.cost,
    `${S.pilot} / ${S.coins}`);
  check("가진 것은 다시 안 산다", acquire(hollow, "pilot") === "equipped" && S.coins === 1000 - hollow.cost,
    "코어 " + S.coins);

  const before = S.coins, row = equipRows()[0];
  check("강화 비용 = 현재 레벨 기준", row.cost === upCost(row.lv), `${row.cost} ≠ ${upCost(row.lv)}`);
  check("강화", upgrade("weapon") === "ok" && S.eq.weapon === row.lv + 1 && S.coins === before - row.cost,
    `LV ${S.eq.weapon} / 코어 ${S.coins}`);
  S.eq.weapon = MAXLV;
  check("만렙이면 더 못 올린다", upgrade("weapon") === "max" && S.eq.weapon === MAXLV, "LV " + S.eq.weapon);

  const dark = SKINS.find(k => k.need);
  check("잠긴 도장", statusOf(dark, S.skin) === "locked", statusOf(dark, S.skin));
}

for (const n of ok) console.log("  통과  " + n);
for (const n of fails) console.log("  실패  " + n);
console.log(`\n${ok.length} 통과 / ${fails.length} 실패`);
process.exit(fails.length ? 1 : 0);
