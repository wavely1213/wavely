import { G, newPlayer } from "./state.js";
import { P, keys } from "./input.js";
import { S, persist } from "./save.js";
import { maxStage, stats } from "./data.js";
import { H, W, clamp } from "./util.js";

/* ═══════════════════════════════════════════════
   런 진행 — 상태만 다룬다
   ═══════════════════════════════════════════════ */
/* 화면 전환·대사·결과 표시는 타깃이 한다. 여기 있는 건 어느 화면에서 보든
   똑같아야 하는 규칙 — 무엇이 초기화되고, 얼마를 받고, 언제 기록이 갱신되는가. */

/* 출격 — 세계를 비우고 기체를 세운다. 아직 웨이브는 시작하지 않는다. */
export function beginRun(stage) {
  G.stage = stage; G.wave = 0;
  G.score = 0; G.coins = 0; G.kills = 0; G.combo = 0; G.maxCombo = 0;
  G.bullets.length = 0; G.ebullets.length = 0; G.enemies.length = 0;
  G.parts.length = 0; G.drops.length = 0; G.echo.length = 0; G.queue.length = 0;
  G.boss = null; G.t = 0; G.shake = 0; G.flash = 0; G.stop = 0; G.muzzle = 0; G.wave1 = null;
  G.over = false;
  G.player = newPlayer();
  P.tx = W / 2; P.ty = H - 130; P.active = false;
  keys.clear();
}

/* 대사가 끝나 실제로 전투가 시작되는 순간 */
export function armStage() { G.phase = "gap"; G.waveT = .6; }

/* 구역 클리어 — 보너스와 보급을 주고 다음 구역으로 옮긴다.
   @returns {{bonus:number, ending:boolean}} 타깃이 알림·엔딩 대사에 쓴다 */
export function finishStage() {
  S.cleared = Math.max(S.cleared, G.stage);
  /* 같은 구역을 반복하는 것보다 깊이 들어가는 쪽이 이득이어야 한다 */
  const bonus = 15 + 5 * G.stage;
  G.coins += bonus;
  persist();

  const ending = G.stage === 5;
  const p = G.player;
  p.hp = Math.min(p.maxHp, p.hp + 1);
  p.bomb = stats().bomb;
  G.stage++; G.wave = 0;
  G.boss = null;
  G.enemies.length = 0; G.ebullets.length = 0;
  return { bonus, ending };
}

/* 런 종료 — 코어 적립과 기록 갱신. 두 번 들어오면 그만큼 중복 적립되므로 한 번만 센다.
   @returns {null|{record:boolean, prevBest:number}} 이미 끝난 런이면 null */
export function finishRun() {
  if (G.over) return null;
  G.over = true;

  S.coins += G.coins;
  const prevBest = S.best;
  const record = G.score > S.best;
  if (record) S.best = G.score;
  persist();
  G.pickStage = clamp(G.stage, 1, maxStage());   /* 재출격은 쓰러진 구역에서 */
  return { record, prevBest };
}

/* 첫 안내는 한 번만 뜬다. 무엇을 보여줬는지는 저장에 남으므로 규칙은 코어가 갖고,
   문구는 타깃이 갖는다 — 「Space 또는 우하단 버튼」 같은 말은 조작이 있는 쪽에서만 맞다.
   @returns 이번에 처음이면 true */
export function markTip(id) {
  if (S.tips.includes(id)) return false;
  S.tips.push(id);
  persist();
  return true;
}
