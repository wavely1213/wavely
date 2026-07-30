/* 코어 검사 — 브라우저 없이 돈다. 이게 성립한다는 것 자체가 코어/타깃 분리의 증거다.
   실행: node game/test/core.mjs   (몇 초)
*/
import {
  setHost, loadSave, S, MAXLV, PILOTS, FRAMES,
  G, P, newPlayer, stats, update, hurt, upCost
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

for (const n of ok) console.log("  통과  " + n);
for (const n of fails) console.log("  실패  " + n);
console.log(`\n${ok.length} 통과 / ${fails.length} 실패`);
process.exit(fails.length ? 1 : 0);
