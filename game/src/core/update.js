import { C } from "./color.js";
import { G } from "./state.js";
import { P, keys } from "./input.js";
import { GUARD_CD, stats } from "./data.js";
import { H, PAD, W, clamp, dist2, rand } from "./util.js";
import { S } from "./save.js";
import { WAVES_PER_STAGE, eSpd, startBoss, startWave } from "./wave.js";
import { aimed, burst, collect, dropLoot, dropSupply, eshot, shoot, spawnEnemy } from "./entity.js";
import { host } from "./host.js";
/* ═══════════════════════════════════════════════
   9. 업데이트
   ═══════════════════════════════════════════════ */
/* 이동은 시뮬레이션과 분리한다 — 히트스톱은 '세계'를 멈추는 연출이지
   조작을 뺏는 장치가 아니다. 회피가 핵심인 장르에서 45ms씩 끊기면 손해로만 느껴진다. */
export function movePlayer(dt, st) {
  const p = G.player;
  if (!p || p.dead) return;
  if (P.active) {
    const dx = P.tx - p.x, dy = P.ty - p.y, d = Math.hypot(dx, dy);
    if (d > .5) { const step = Math.min(d, st.speed * 1.7 * dt); p.x += dx / d * step; p.y += dy / d * step; }
  } else {
    let kx = 0, ky = 0;
    if (keys.has("arrowleft") || keys.has("a")) kx -= 1;
    if (keys.has("arrowright") || keys.has("d")) kx += 1;
    if (keys.has("arrowup") || keys.has("w")) ky -= 1;
    if (keys.has("arrowdown") || keys.has("s")) ky += 1;
    if (kx || ky) { const n = Math.hypot(kx, ky); p.x += kx / n * st.speed * dt; p.y += ky / n * st.speed * dt; }
  }
  p.x = clamp(p.x, PAD + 10, W - PAD - 10);
  p.y = clamp(p.y, 60, H - 34);
}

export function update(dt) {
  G.t += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 3);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 3);
  if (G.muzzle > 0) G.muzzle = Math.max(0, G.muzzle - dt);

  const p = G.player;
  const st = stats();

  movePlayer(dt, st);
  if (p.inv > 0) p.inv -= dt;
  if (p.surge > 0) p.surge = Math.max(0, p.surge - dt);
  if (p.dodgeT > 0) p.dodgeT = Math.max(0, p.dodgeT - dt);
  if (st.guard && p.guard < GUARD_CD) p.guard = Math.min(GUARD_CD, p.guard + dt);

  /* — 잔상 트레일 — */
  if (S.trail === "echo") {
    G.echo.push({ x: p.x, y: p.y, t: 0 });
    if (G.echo.length > 10) G.echo.shift();
  }
  for (const e of G.echo) e.t += dt;

  /* — 배기 파티클 — */
  if (!host.reduced && Math.random() < .8) {
    const tcol = S.trail === "ion" ? C.drift : S.trail === "bloom" ? C.moss : C.signal;
    if (S.trail !== "echo")
      G.parts.push({ x: p.x + rand(-4, 4), y: p.y + 12, vx: rand(-14, 14), vy: rand(60, 130), life: .3, max: .3, col: tcol, sz: S.trail === "bloom" ? rand(2, 3.4) : rand(1, 2.4) });
  }

  /* — 사격 — */
  p.cd -= dt;
  if (p.cd <= 0 && !p.dead) { shoot(); p.cd = st.rate * (p.surge > 0 ? .55 : 1); }

  /* — 콤보 감쇠 — */
  if (G.combo > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }

  /* — 아군 탄 — */
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -20 || b.x < -20 || b.x > W + 20) { G.bullets.splice(i, 1); continue; }

    let consumed = false;
    for (const e of G.enemies) {
      if (b.hit.includes(e)) continue;
      if (dist2(b.x, b.y, e.x, e.y) < (e.r + b.r) ** 2) {
        damageEnemy(e, b.dmg);
        if (b.pierce > 0) { b.pierce--; b.hit.push(e); }
        else { consumed = true; }
        break;
      }
    }
    if (!consumed && G.boss && !G.boss.dead && G.boss.entered && !b.hit.includes(G.boss)) {
      const bo = G.boss;
      if (dist2(b.x, b.y, bo.x, bo.y) < (bo.r + b.r) ** 2) {
        bo.hp -= b.dmg;
        burst(b.x, b.y, C.signal, 3, .6);
        host.sound.hit();
        if (b.pierce > 0) { b.pierce--; b.hit.push(bo); } else consumed = true;
        if (bo.hp <= 0) killBoss();
      }
    }
    if (consumed) G.bullets.splice(i, 1);
  }

  /* — 적 — */
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    e.t += dt;

    if (e.kind === "drone") {
      e.y += e.vy * dt;
      e.x = e.x0 + Math.sin(e.t * 2.1 + e.ph) * e.amp;
    } else if (e.kind === "weaver") {
      e.y += e.vy * dt;
      e.x = e.x0 + Math.sin(e.t * 1.5 + e.ph) * e.amp;
      e.shootT -= dt;
      if (e.shootT <= 0 && e.y > 50 && e.y < H - 160) { aimed(e.x, e.y + 12, eSpd(200, 12)); host.sound.blip(300, .05, "sawtooth", .02); e.shootT = Math.max(.7, 1.9 - .12 * G.stage); }
    } else if (e.kind === "turret") {
      if (e.y < e.stopY) e.y += e.vy * dt;
      else {
        e.life -= dt;
        e.shootT -= dt;
        if (e.shootT <= 0) {
          for (let k = -1; k <= 1; k++) aimed(e.x, e.y + 14, eSpd(175, 10), k * .3);
          host.sound.blip(240, .06, "sawtooth", .022);
          e.shootT = Math.max(.9, 2.3 - .14 * G.stage);
        }
        if (e.life <= 0) e.y += e.vy * 1.4 * dt;
      }
    } else if (e.kind === "rusher") {
      if (e.t < .45) { e.y += 40 * dt; }
      else {
        if (!e.aim) { const a = Math.atan2(p.y - e.y, p.x - e.x), rs = eSpd(320, 14); e.aim = { vx: Math.cos(a) * rs, vy: Math.sin(a) * rs }; }
        e.x += e.aim.vx * dt; e.y += e.aim.vy * dt;
      }
    }

    if (e.y > H + 40 || e.x < -60 || e.x > W + 60) { G.enemies.splice(i, 1); continue; }

    /* 접촉 */
    if (p.inv <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.r + p.r) ** 2) { hurt(); damageEnemy(e, 999); }
  }

  /* — 보스 — */
  if (G.boss && !G.boss.dead) updateBoss(dt, p);
  else updateBossDeath(dt);

  /* — 적 탄 — */
  for (let i = G.ebullets.length - 1; i >= 0; i--) {
    const b = G.ebullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -30 || b.y > H + 30 || b.x < -30 || b.x > W + 30) { G.ebullets.splice(i, 1); continue; }
    if (p.inv <= 0 && dist2(b.x, b.y, p.x, p.y) < (b.r + p.r - 3) ** 2) { G.ebullets.splice(i, 1); hurt(); }
  }

  /* — 드롭 — */
  const mag = st.magnet;                       /* 기체 「견인장 확대」가 여기서 갈린다 */
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i];
    d.t += dt;
    d.vy += 260 * dt;
    const dd = Math.hypot(p.x - d.x, p.y - d.y) || .001;
    if (dd < mag) { const k = (1 - dd / mag) * 900; d.vx += (p.x - d.x) / dd * k * dt; d.vy += (p.y - d.y) / dd * k * dt; }
    d.x += d.vx * dt; d.y += d.vy * dt;
    if (dd < 18) {
      G.drops.splice(i, 1);
      collect(d);
      G.parts.push({ x: d.x, y: d.y, vx: 0, vy: -40, life: .3, max: .3, col: C.moss, sz: 3 });
      continue;
    }
    if (d.y > H + 30) G.drops.splice(i, 1);
  }

  /* — 파티클 — */
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const q = G.parts[i];
    q.life -= dt;
    if (q.life <= 0) { G.parts.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt;
    q.vx *= .94; q.vy *= .94;
    if (q.len) q.rot += q.vr * dt;
  }

  /* 군체 피격 섬광 감쇠 */
  for (const e of G.enemies) if (e.flash > 0) e.flash -= dt;

  updateShock(dt);

  /* — 진행 — */
  if (G.phase === "wave") {
    G.waveT += dt;
    while (G.queue.length && G.queue[0].d <= G.waveT) spawnEnemy(G.queue.shift());
    if (!G.queue.length && !G.enemies.length) { G.wave++; G.phase = "gap"; G.waveT = 0; }
  } else if (G.phase === "gap") {
    G.waveT += dt;
    if (G.waveT > 1.1) { if (G.wave >= WAVES_PER_STAGE) startBoss(); else startWave(); }
  } else if (G.phase === "clear") {
    G.waveT += dt;
    if (G.waveT > 2.2) host.stageCleared();
  }

  host.hudChanged();
}

export function updateBoss(dt, p) {
  const b = G.boss;
  b.t += dt; b.spin += dt;
  if (b.warn > 0) b.warn -= dt;
  if (!b.entered) {
    /* 경보가 먼저 뜨고, 그다음 강하한다 — 갑자기 나타나면 억울한 죽음이 된다 */
    if (b.warn > .9) return;
    b.y += 90 * dt;
    if (b.y >= 130) { b.y = 130; b.entered = true; }
    return;
  }
  b.x = W / 2 + Math.sin(b.t * .55) * (W / 2 - PAD - b.r - 8);
  b.y = 130 + Math.sin(b.t * .9) * 14;

  const ratio = b.hp / b.max;
  const ph = ratio > .6 ? 1 : ratio > .3 ? 2 : 3;
  b.atkT -= dt;
  if (b.atkT <= 0) {
    const spd = eSpd(150, 14);
    if (ph === 1) {
      const n = 10;
      for (let i = 0; i < n; i++) { const a = i / n * 6.283 + b.spin; eshot(b.x, b.y, Math.cos(a) * spd, Math.sin(a) * spd, 5); }
      b.atkT = 2.1;
    } else if (ph === 2) {
      for (let k = -2; k <= 2; k++) aimed(b.x, b.y + 20, spd * 1.2, k * .22);
      const n = 12;
      for (let i = 0; i < n; i++) { const a = i / n * 6.283 + b.spin * 1.6; eshot(b.x, b.y, Math.cos(a) * spd * .8, Math.sin(a) * spd * .8, 5); }
      b.atkT = 1.6;
    } else {
      for (let k = -3; k <= 3; k++) aimed(b.x, b.y + 20, spd * 1.25, k * .17);
      b.atkT = .95;
    }
    host.sound.blip(160, .09, "sawtooth", .03);
  }
  if (p.inv <= 0 && dist2(b.x, b.y, p.x, p.y) < (b.r + p.r) ** 2) hurt();
}

export function damageEnemy(e, dmg) {
  e.hp -= dmg;
  e.flash = .09;
  burst(e.x, e.y, C.drift, 3, .5);
  host.sound.hit();
  if (e.hp <= 0) {
    const idx = G.enemies.indexOf(e);
    if (idx >= 0) G.enemies.splice(idx, 1);
    G.kills++;
    G.combo++; G.comboT = 2.2;
    if (G.combo > G.maxCombo) G.maxCombo = G.combo;
    if (G.combo === 4) host.tip("combo");          /* 배율이 처음 붙는 순간 */
    G.score += Math.round(e.score * comboMul());
    /* 처치 정지 — 프레임당 한 번만 걸어 연속 처치 시 누적되지 않게 한다 */
    G.stop = Math.max(G.stop, .045);
    burst(e.x, e.y, C.drift, 14, 1, true);
    dropLoot(e.x, e.y, e.kind === "turret" ? 3 : e.kind === "weaver" ? 2 : 1);
    if (Math.random() < .045) dropSupply(e.x, e.y);   /* 탑승자별 보급품 */
    G.shake = Math.min(1, G.shake + .12);
    host.sound.boom();
  }
}

/* 기체 「정격 출력」이 상한을 x5 -> x6으로 올린다.
   4킬마다 +0.5 — 5킬 기준일 때는 실측 콤보(11~27)가 x2.0~x3.5에 머물러
   상한 자체가 닿지 않는 장식이었다. */
export function comboMul() { return Math.min(stats().comboCap, 1 + Math.floor(G.combo / 4) * .5); }

export function killBoss() {
  const b = G.boss;
  b.dead = true; b.dieT = 0;
  G.kills++;
  G.score += Math.round(5000 * comboMul());
  burst(b.x, b.y, C.drift, 34, 1.6, true);   /* 1단: 차폐가 먼저 깨진다 */
  dropLoot(b.x, b.y, 26);
  dropSupply(b.x - 16, b.y); dropSupply(b.x + 16, b.y);
  G.ebullets.length = 0;
  G.shake = 1; G.flash = .7;
  G.stop = .14;                              /* 격파는 더 길게 */
  host.sound.big();
  G.phase = "clear"; G.waveT = 0;
}

/* 격파는 3단으로 무너진다: 차폐 붕괴 → 장갑 분리 → 코어 폭발.
   즉시 사라지면 구역 하나를 끝냈다는 사실이 화면에 남지 않는다. */
export function updateBossDeath(dt) {
  const b = G.boss;
  if (!b || !b.dead || b.dieT > 1.3) return;
  const was = b.dieT;
  b.dieT += dt;
  if (was < .35 && b.dieT >= .35) {          /* 2단: 장갑이 뜯긴다 */
    burst(b.x, b.y, C.drift, 30, 2.0, true);
    G.shake = Math.max(G.shake, .7);
    host.sound.boom();
  }
  if (was < .8 && b.dieT >= .8) {            /* 3단: 코어가 터진다 */
    burst(b.x, b.y, C.signal, 44, 2.4, true);
    G.shake = 1; G.flash = 1;
    host.sound.big();
  }
}

/* 피격 처리 순서: 육각 차폐 → 탑승자 회피 → 실제 피해 */
export function hurt() {
  const p = G.player, st = stats();

  /* 이미 쓰러진 뒤에도 피격은 계속 들어온다. 막지 않으면 무적 1.4초가 지난 뒤
     hp가 −1, −2로 내려가며 runEnded가 매번 다시 불린다.
     웹에서는 결과 화면이 루프를 멈춰 가려졌을 뿐, 불변식은 여기 있어야 한다. */
  if (p.dead || p.inv > 0) return;

  if (st.guard && p.guard >= GUARD_CD) {
    p.guard = 0; p.inv = .7;
    burst(p.x, p.y, C.drift, 22, 1.2);
    G.flash = .35;
    if (S.tips.includes("guard")) host.notify("육각 차폐 전개"); else host.tip("guard");
    host.sound.blip(520, .16, "triangle", .05);
    return;
  }

  if (Math.random() < st.evade) {
    p.inv = .55; p.dodgeT = .6;
    burst(p.x, p.y, C.dust, 10, .8);
    if (S.tips.includes("evade")) host.notify("회피"); else host.tip("evade");
    host.sound.blip(760, .07, "triangle", .035);
    return;
  }

  p.hp--; p.inv = 1.4;
  G.combo = 0;
  G.shake = 1; G.flash = .6; G.stop = .1;  /* 맞은 것도 한 박자 끊어 인지시킨다 */
  burst(p.x, p.y, C.signal, 20, 1.3);
  host.sound.hurt();
  if (p.hp <= 0) { p.dead = true; burst(p.x, p.y, C.signal, 50, 2); host.sound.big(); host.runEnded(); }
}

export function useBomb() {
  const p = G.player;
  /* 화면 상태를 함수 안에서 다시 확인한다 — inert·오버레이는 입력 경로를 막을 뿐,
     불변식 자체는 아니다. */
  if (G.screen !== "play" || G.over) return;
  if (p.bomb <= 0 || p.dead) return;
  p.bomb--;
  G.flash = 1; G.shake = 1; G.stop = .08;
  p.inv = Math.max(p.inv, .8);
  /* 육각 충격파 — 세계관의 차폐와 같은 어휘. 링이 지나간 자리부터 탄이 지워진다. */
  G.wave1 = { x: p.x, y: p.y, r: 0, t: 0 };
  host.sound.bomb();
  for (const e of [...G.enemies]) damageEnemy(e, 60);
  if (G.boss && !G.boss.dead && G.boss.entered) { G.boss.hp -= 140; if (G.boss.hp <= 0) killBoss(); }
  burst(p.x, p.y, C.moss, 40, 1.8, true);
  host.hudChanged();
}

/* 충격파가 실제로 훑고 지나가며 탄을 지운다 — 즉시 비우면 링과 타이밍이 어긋난다 */
export function updateShock(dt) {
  const s = G.wave1;
  if (!s) return;
  s.t += dt;
  const prev = s.r;
  s.r = s.t * 1400;
  for (let i = G.ebullets.length - 1; i >= 0; i--) {
    const b = G.ebullets[i];
    const d = Math.hypot(b.x - s.x, b.y - s.y);
    if (d <= s.r && d > prev - 40) {
      G.ebullets.splice(i, 1);
      G.parts.push({ x: b.x, y: b.y, vx: rand(-30, 30), vy: rand(-30, 30), life: .25, max: .25, col: C.moss, sz: 3 });
    } else if (d <= prev) {
      G.ebullets.splice(i, 1);
    }
  }
  if (s.r > 900) G.wave1 = null;
}
