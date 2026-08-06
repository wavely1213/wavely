import { C } from "./color.js";
import { G } from "./state.js";
import { S, persist } from "./save.js";
import { host } from "./host.js";
import { hpScale } from "./wave.js";
import { loadout, stats } from "./data.js";
import { rand } from "./util.js";
/* ═══════════════════════════════════════════════
   8. 엔티티 생성
   ═══════════════════════════════════════════════ */
export function spawnEnemy(s) {
  const k = hpScale(G.stage);
  const base = { x: s.x, y: -26, t: 0, r: 13, kind: s.t, shootT: rand(.6, 1.6), x0: s.x, ph: rand(0, 6.28), amp: s.amp || 26,
                 flash: 0, dmgX: rand(-3, 3), dmgY: rand(-2, 2) };
  if (s.t === "drone")  Object.assign(base, { hp: 14 * k, vy: 110 + 8 * G.stage, score: 100, r: 12 });
  if (s.t === "weaver") Object.assign(base, { hp: 26 * k, vy: 62 + 6 * G.stage, score: 160, r: 14, amp: 92 });
  if (s.t === "turret") Object.assign(base, { hp: 44 * k, vy: 90, score: 220, r: 16, stopY: rand(120, 240), life: 8.5 });
  if (s.t === "rusher") Object.assign(base, { hp: 18 * k, vy: 0, score: 130, r: 12, aim: null });
  base.maxHp = base.hp;
  G.enemies.push(base);
  if (!S.codex.includes(s.t)) { S.codex.push(s.t); persist(); }
}

/* 무기 코일이 4기 공용이라 기체 선택이 숫자 차이로만 느껴졌다.
   같은 레벨의 같은 발수를 기체마다 다르게 배치해 손맛이 갈리게 한다.
   위력·발수는 장비가 정하고, 기체는 '어디로 나가는가'만 바꾼다. */
export const ARMS = {
  /* 제식 — 기준 배치 */
  std(out, p, n, d, pc, V) {
    if (n === 1) out.push(B(p.x, p.y - 15, 0, -V, d, pc));
    else if (n === 2) out.push(B(p.x - 8, p.y - 12, 0, -V, d, pc), B(p.x + 8, p.y - 12, 0, -V, d, pc));
    else if (n === 3) out.push(B(p.x, p.y - 15, 0, -V, d, pc),
                               B(p.x - 7, p.y - 8, -130, -V * .96, d),
                               B(p.x + 7, p.y - 8,  130, -V * .96, d));
    else out.push(B(p.x, p.y - 15, 0, -V, d, pc),
                  B(p.x -  7, p.y - 10, -120, -V * .96, d),
                  B(p.x +  7, p.y - 10,  120, -V * .96, d),
                  B(p.x - 13, p.y -  2, -260, -V * .86, d),
                  B(p.x + 13, p.y -  2,  260, -V * .86, d));
  },
  /* 집속 랜스 — 전부 중앙으로 모은다. 정면이 두껍고 폭이 없다 */
  lance(out, p, n, d, pc, V) {
    for (let k = 0; k < n; k++) {
      const off = (k - (n - 1) / 2) * 4;
      out.push(B(p.x + off, p.y - 15 - Math.abs(off) * .5, off * 5, -V * 1.06, d, k === 0 ? pc : 0));
    }
  },
  /* 광각 산탄 — 크게 벌린다. 정면 밀도는 낮지만 화면을 훑는다 */
  fan(out, p, n, d, pc, V) {
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0 : (k / (n - 1) - .5) * 2;      /* -1 … 1 */
      out.push(B(p.x + t * 12, p.y - 12, t * 250, -V * (1 - Math.abs(t) * .12), d, k === 0 ? pc : 0));
    }
  },
  /* 측면 사출 — 앞으로 나가되 뒤쪽 2발이 비스듬히 되돌아 나간다 */
  flank(out, p, n, d, pc, V) {
    const fwd = Math.max(1, n - 2);
    for (let k = 0; k < fwd; k++) {
      const t = fwd === 1 ? 0 : (k / (fwd - 1) - .5) * 2;
      out.push(B(p.x + t * 9, p.y - 14, t * 110, -V, d, k === 0 ? pc : 0));
    }
    if (n >= 2) {
      out.push(B(p.x - 14, p.y + 4, -300, -V * .55, d));
      out.push(B(p.x + 14, p.y + 4,  300, -V * .55, d));
    }
  }
};

export function shoot() {
  const st = stats(), p = G.player, V = 620, out = G.bullets;
  const arm = ARMS[loadout().frame.arm] || ARMS.std;
  arm(out, p, st.shots, st.dmg, st.pierce, V);
  G.muzzle = .05;
  host.sound.shoot();
}
export function B(x, y, vx, vy, dmg, pierce) {
  return { x, y, vx, vy, dmg, r: pierce ? 6 : 4, pierce: pierce || 0, hit: [], lv: S.eq.weapon };
}

export function eshot(x, y, vx, vy, r) { G.ebullets.push({ x, y, vx, vy, r: r || 5 }); }
export function aimed(x, y, spd, spread) {
  const p = G.player;
  const a = Math.atan2(p.y - y, p.x - x) + (spread || 0);
  eshot(x, y, Math.cos(a) * spd, Math.sin(a) * spd);
}

/* shard=true면 절반이 회전하는 금속 조각으로 튄다 — 기계가 부서지는 느낌 */
export function burst(x, y, col, n, pow, shard) {
  const cnt = host.reduced ? Math.ceil(n / 3) : n;
  for (let i = 0; i < cnt; i++) {
    const a = rand(0, 6.283), s = rand(40, 60) * (pow || 1);
    const q = { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.25, .6), max: .6, col, sz: rand(1.5, 3.5) * (pow || 1) };
    if (shard && i % 2 === 0) { q.rot = rand(0, 6.283); q.vr = rand(-10, 10); q.len = q.sz * rand(1.8, 3.6); }
    G.parts.push(q);
  }
}

export function dropLoot(x, y, n) {
  for (let i = 0; i < n; i++)
    G.drops.push({ x: x + rand(-10, 10), y: y + rand(-8, 8), vx: rand(-40, 40), vy: rand(-70, -20), r: 6, t: 0, kind: "core" });
}

/* 탑승자마다 떨어지는 보급품이 다르다 — PILOTS[].drop */
export function dropSupply(x, y) {
  G.drops.push({ x, y, vx: rand(-30, 30), vy: rand(-90, -50), r: 8, t: 0, kind: stats().drop });
}

export const SUPPLY = {
  cluster: { nm: "코어 뭉치", col: () => C.moss },
  repair:  { nm: "정비 부품", col: () => C.moss },
  surge:   { nm: "과부하 셀", col: () => C.signal },
  ord:     { nm: "예비 탄두", col: () => C.dust }
};

export function collect(d) {
  const p = G.player;
  if (d.kind === "core") { G.coins++; host.sound.coin(); return; }
  if (d.kind === "cluster") {
    G.coins += 5; host.notify("코어 뭉치 — 코어 5");
  } else if (d.kind === "repair") {
    if (p.hp < p.maxHp) { p.hp++; host.notify("정비 부품 — 내구 회복"); }
    else { G.coins += 3; host.notify("정비 부품 — 코어 3 환산"); }
  } else if (d.kind === "surge") {
    p.surge = 8; host.notify("과부하 셀 — 연사 +45%");
  } else if (d.kind === "ord") {
    if (p.bomb < p.maxBomb) { p.bomb++; host.notify("예비 탄두 — 폭탄 보급"); }
    else { G.coins += 3; host.notify("예비 탄두 — 코어 3 환산"); }
  }
  burst(d.x, d.y, SUPPLY[d.kind].col(), 12, 1);
  host.sound.blip(1560, .09, "triangle", .04);
  host.tip("supply");                        /* 아이템 알림이 먼저 뜨고 그 뒤에 안내 */
}
