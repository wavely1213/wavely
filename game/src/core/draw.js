import { B, SUPPLY } from "./entity.js";
import { C, alpha, colorVer, shade } from "./color.js";
import { G } from "./state.js";
import { GUARD_CD, SKINS, stageEn, stageName, stats } from "./data.js";
import { H, PAD, W, clamp, rand } from "./util.js";
import { S } from "./save.js";
import { host } from "./host.js";
/* ═══════════════════════════════════════════════
   10. 그리기
   ═══════════════════════════════════════════════ */
/* 그리기는 Canvas2D 인터페이스에만 의존한다. 웹은 진짜 2D 컨텍스트를,
   앱은 Skia 위에 얹은 같은 모양의 어댑터를 넣는다 (native/skia2d.js). */
let ctx = null;
export function setCtx(c) { ctx = c; }
export function draw() {
  ctx.save();

  if (G.shake > 0 && !host.reduced) {
    const s = G.shake * 7;
    ctx.translate(rand(-s, s), rand(-s, s));
  }

  /* 필드 */
  ctx.fillStyle = C.field;
  ctx.fillRect(-20, -20, W + 40, H + 40);
  drawBackdrop();

  /* 회수품 — 종류마다 형태가 다르다 */
  for (const d of G.drops) {
    if (d.kind === "core") {
      ctx.fillStyle = C.moss;
      ctx.beginPath(); ctx.arc(d.x, d.y, 3.4 + Math.sin(d.t * 9) * .7, 0, 6.283); ctx.fill();
      ctx.strokeStyle = alpha(C.moss, .35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(d.x, d.y, 7, 0, 6.283); ctx.stroke();
      continue;
    }
    const col = SUPPLY[d.kind].col();
    const pulse = 1 + Math.sin(d.t * 7) * .12;
    ctx.save();
    ctx.translate(d.x, d.y); ctx.scale(pulse, pulse);
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.fillStyle = col;
    if (d.kind === "cluster") {
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * 6.283 + d.t;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 4, Math.sin(a) * 4, 2.6, 0, 6.283); ctx.fill();
      }
    } else if (d.kind === "repair") {
      ctx.fillRect(-6, -1.8, 12, 3.6); ctx.fillRect(-1.8, -6, 3.6, 12);
    } else if (d.kind === "surge") {
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(4, -1); ctx.lineTo(1, -1);
      ctx.lineTo(2, 7); ctx.lineTo(-4, 0); ctx.lineTo(-1, 0);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, 6.283); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = alpha(col, .3); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(d.x, d.y, 11 + Math.sin(d.t * 5) * 1.5, 0, 6.283); ctx.stroke();
  }

  /* 파티클 — len이 있으면 회전하는 금속 조각 */
  for (const q of G.parts) {
    ctx.globalAlpha = clamp(q.life / q.max, 0, 1);
    ctx.fillStyle = q.col;
    if (q.len) {
      ctx.save();
      ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      ctx.fillRect(-q.len / 2, -q.sz / 4, q.len, Math.max(1, q.sz / 2));
      ctx.restore();
    } else {
      ctx.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, q.sz);
    }
  }
  ctx.globalAlpha = 1;

  /* 적 */
  for (const e of G.enemies) drawEnemy(e);
  if (G.boss && (!G.boss.dead || G.boss.dieT < 1.3)) drawBoss(G.boss);

  /* 아군 탄 — 레벨이 오를수록 길어지고 코어가 밝아진다.
     강화의 보상이 수치가 아니라 화면에서 보이도록. */
  for (const b of G.bullets) {
    const h = b.pierce ? 22 : 11 + b.lv * 1.6;
    if (b.pierce) {                          /* 관통탄은 잔광을 끈다 */
      ctx.globalAlpha = .28;
      ctx.fillStyle = C.signal;
      ctx.fillRect(b.x - b.r * .9, b.y - h * .9, b.r * 1.8, h * 1.8);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.signal;
    ctx.fillRect(b.x - b.r / 2, b.y - h / 2, b.r, h);
    if (b.lv >= 3) {                         /* 코어 — 3레벨부터 심이 보인다 */
      ctx.fillStyle = shade(C.signal, .55);
      ctx.fillRect(b.x - b.r / 6, b.y - h / 2 + 1, b.r / 3, h - 2);
    }
  }
  ctx.globalAlpha = 1;

  /* 총구 섬광 — 플레이어는 아래에서 선언되므로 G.player를 직접 쓴다 */
  const mp = G.player;
  if (G.muzzle > 0 && mp && !mp.dead) {
    ctx.globalAlpha = clamp(G.muzzle / .05, 0, 1) * .5;
    ctx.fillStyle = shade(C.signal, .5);
    ctx.beginPath();
    ctx.ellipse(mp.x, mp.y - 15, 3.5 + S.eq.weapon * .8, 6 + S.eq.weapon * 1.4, 0, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* 적 탄 */
  for (const b of G.ebullets) {
    ctx.fillStyle = C.drift;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.field;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * .38, 0, 6.283); ctx.fill();
  }

  /* 플레이어 */
  const p = G.player;
  if (p && !p.dead) {
    if (S.trail === "echo") {
      for (let i = 0; i < G.echo.length; i++) {
        const e = G.echo[i];
        ctx.globalAlpha = (i / G.echo.length) * .22;
        drawShip(ctx, e.x, e.y, .92);
      }
      ctx.globalAlpha = 1;
    }
    /* 과부하 셀 — 기체가 달아오른다 */
    if (p.surge > 0) {
      const a = (.18 + .1 * Math.sin(G.t * 18)) * clamp(p.surge, 0, 1);
      ctx.strokeStyle = alpha(C.signal, a * 3);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 21 + Math.sin(G.t * 12) * 2, 0, 6.283); ctx.stroke();
    }

    /* 회피 성공 — 기체가 지나간 자리만 남는다 */
    if (p.dodgeT > 0) {
      ctx.globalAlpha = p.dodgeT / .6 * .5;
      ctx.strokeStyle = C.dust; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, 16 + (1 - p.dodgeT / .6) * 20, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const blink = p.inv > 0 && Math.floor(G.t * 14) % 2 === 0;
    ctx.globalAlpha = blink ? .35 : 1;
    drawShip(ctx, p.x, p.y, 1);
    ctx.globalAlpha = 1;

    /* 육각 차폐 — 충전되면 실선, 충전 중이면 진행도만큼 그린다 */
    if (stats().guard) {
      const k = p.guard / GUARD_CD;
      ctx.strokeStyle = k >= 1 ? alpha(C.drift, .75) : alpha(C.drift, .3);
      ctx.lineWidth = k >= 1 ? 1.6 : 1;
      ctx.beginPath();
      const seg = Math.max(1, Math.round(k * 6));
      for (let i = 0; i <= seg; i++) {
        const a = i / 6 * 6.283 - Math.PI / 2;
        const hx = p.x + Math.cos(a) * 22, hy = p.y + Math.sin(a) * 22;
        i ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy);
      }
      ctx.stroke();
    }
  }

  drawShock();

  /* 접근 경보 — 보스가 오기 전에 알려준다 */
  if (G.boss && G.boss.warn > 0 && !G.boss.dead) {
    const w = G.boss.warn;
    const a = clamp(w * 2, 0, 1) * clamp((2.0 - w) * 4, 0, 1);
    const blink = Math.floor(G.t * 6) % 2 === 0;
    ctx.globalAlpha = a;
    ctx.fillStyle = alpha(C.signal, .12);
    ctx.fillRect(PAD, H / 2 - 42, W - 2 * PAD, 84);
    ctx.globalAlpha = a * (blink ? 1 : .35);
    ctx.fillStyle = C.signal;
    ctx.font = "600 20px " + host.fontFamily;
    ctx.textAlign = "center";
    ctx.fillText("AX 증폭 코어 · 접근", W / 2, H / 2 - 2);
    ctx.globalAlpha = a;
    ctx.font = "10px " + host.fontFamily;
    ctx.fillStyle = C.dim;
    ctx.fillText("CORE APPROACHING", W / 2, H / 2 + 20);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }

  /* 구역 전환 — 계기판이 다음 구역으로 갱신되는 것처럼 보여준다.
     입력은 잠그지 않는다(이동·폭탄 유지). */
  if (G.phase === "clear") {
    const t = G.waveT;
    const fam = host.fontFamily;
    const a = clamp(t * 2, 0, 1) * clamp((2.4 - t) * 2, 0, 1);
    ctx.textAlign = "center";

    ctx.globalAlpha = a * .1;
    ctx.fillStyle = C.fg;
    ctx.fillRect(PAD, H / 2 - 56, W - 2 * PAD, 112);

    ctx.globalAlpha = a;
    ctx.fillStyle = C.fg;
    ctx.font = "600 22px " + fam;
    ctx.fillText("구역 정리 완료", W / 2, H / 2 - 16);
    ctx.font = "10px " + fam;
    ctx.fillStyle = C.dim;
    ctx.fillText("SECTOR CLEAR", W / 2, H / 2 + 4);

    /* 1초 뒤부터 다음 구역 표기가 올라온다 */
    if (t > 1) {
      const nx = G.stage + 1;
      ctx.globalAlpha = clamp((t - 1) * 3, 0, 1) * a;
      ctx.strokeStyle = alpha(C.dust, .5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W / 2 - 70, H / 2 + 16); ctx.lineTo(W / 2 + 70, H / 2 + 16); ctx.stroke();
      ctx.fillStyle = C.signal;
      ctx.font = "600 14px " + fam;
      ctx.fillText("STAGE " + nx + " · " + stageName(nx), W / 2, H / 2 + 38);
      ctx.fillStyle = C.dim;
      ctx.font = "9px " + fam;
      ctx.fillText(stageEn(nx), W / 2, H / 2 + 52);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
  }

  ctx.restore();

  /* 플래시 */
  if (G.flash > 0) {
    ctx.fillStyle = alpha(C.fg, G.flash * .3);
    ctx.fillRect(0, 0, W, H);
  }

  /* 보스 체력 바 */
  if (G.boss && !G.boss.dead && G.boss.entered) {
    const w = W - 2 * PAD - 40;                       /* y=58: HUD 하트줄(≤47) 아래로 비운다 */
    ctx.fillStyle = alpha(C.dim, .25);
    ctx.fillRect(PAD + 20, 58, w, 3);
    ctx.fillStyle = C.drift;
    ctx.fillRect(PAD + 20, 58, w * clamp(G.boss.hp / G.boss.max, 0, 1), 3);
  }
}

/* 구역마다 대역의 상태가 다르다. 이름이 이미 방향을 정해주므로 그대로 따른다.
   flow 음수 = 파형이 역류(근원), noise = 파형이 무너진 정도, seam = 격벽 유무. */
export const BACKDROP = {
  1: { amp: 1.0, layers: 2, flow: 1.0, noise: 0,   seam: 1, echo: 0, glow: 0 },  /* 정적 지대 */
  2: { amp: 1.5, layers: 3, flow: 1.2, noise: 0,   seam: 1, echo: 0, glow: 0 },  /* 간섭 구역 */
  3: { amp: 1.2, layers: 2, flow: 1.0, noise: 0,   seam: 1, echo: 1, glow: 0 },  /* 반향의 벽 */
  4: { amp: .5,  layers: 1, flow: .7,  noise: 1,   seam: 0, echo: 0, glow: 0 },  /* 백색 소음 */
  5: { amp: 1.8, layers: 2, flow: -1.4, noise: .3, seam: 1, echo: 0, glow: 1 }   /* 근원 — 역류 */
};
export function backdropOf(stage) {
  if (BACKDROP[stage]) return BACKDROP[stage];
  /* 잔향 — 4·5를 섞고 갈수록 탈색된다 */
  const k = Math.min(1, (stage - 5) / 8);
  return { amp: .9, layers: 2, flow: -1.0, noise: .5 + k * .5, seam: 0, echo: 1, glow: 1, fade: k };
}

/* 배경: 스크롤되는 파형 + 미세 먼지 */
export const motes = Array.from({ length: 38 }, () => ({ x: rand(0, W), y: rand(0, H), s: rand(18, 70), w: rand(4, 16) }));
export function drawBackdrop() {
  const t = G.t;
  const B = backdropOf(G.stage);
  const dim = B.fade ? .18 * (1 - B.fade * .6) : .18;

  /* 근원의 광원 — 위에서 대역을 끌어올리는 것이 있다 */
  if (B.glow) {
    const g = ctx.createRadialGradient(W / 2, -40, 10, W / 2, -40, 420);
    g.addColorStop(0, alpha(C.signal, .16));
    g.addColorStop(1, alpha(C.signal, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 420);
  }

  ctx.strokeStyle = alpha(C.dust, dim);
  ctx.lineWidth = 1;
  for (let k = 0; k < B.layers; k++) {
    const off = (t * (26 + k * 18) * B.flow) % 90;
    ctx.beginPath();
    for (let y = -90 + off; y < H + 90; y += 90) {
      for (let x = 0; x <= W; x += 12) {
        const yy = y + Math.sin((x / W) * 6.283 * (1 + k) + t * (1.1 + k * .6)) * (9 + k * 5) * B.amp;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
    }
    ctx.stroke();
  }

  /* 반향 — 지나간 파형이 1.4초 늦게 한 번 더 지나간다 */
  if (B.echo) {
    const te = t - 1.4;
    ctx.strokeStyle = alpha(C.drift, dim * .8);
    const off = (te * 26 * B.flow) % 90;
    ctx.beginPath();
    for (let y = -90 + off; y < H + 90; y += 90) {
      for (let x = 0; x <= W; x += 12) {
        const yy = y + Math.sin((x / W) * 6.283 + te * 1.1) * 9 * B.amp;
        if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
    }
    ctx.stroke();
  }

  /* 백색 소음 — 파형이 무너져 알갱이만 남는다 */
  if (B.noise) {
    ctx.fillStyle = alpha(C.dust, .16 * B.noise);
    const n = Math.round(90 * B.noise);
    for (let i = 0; i < n; i++) {
      const nx = (i * 97.31 + t * 40) % W;
      const ny = (i * 173.7 + t * 90 * B.flow) % H;
      ctx.fillRect(nx, (ny + H) % H, 2, 2);
    }
  }

  ctx.fillStyle = alpha(C.dust, .3);
  for (const m of motes) {
    m.y += m.s * G.dt * B.flow;           /* 고정 1/60이면 120Hz에서 배경만 절반 속도로 흐른다 */
    if (m.y > H + 10) { m.y = -10; m.x = rand(0, W); }
    if (m.y < -10) { m.y = H + 10; m.x = rand(0, W); }
    ctx.fillRect(m.x, m.y, m.w, 1);
  }

  /* 격벽 이음새 + 리벳 — 구조물이 남아 있는 구역에서만 */
  if (B.seam) {
    const seam = (t * 34 * B.flow) % 200;
    ctx.strokeStyle = alpha(C.line, .8);
    ctx.lineWidth = 1;
    ctx.fillStyle = alpha(C.dust, .35);
    for (let y = -200 + ((seam + 200) % 200); y < H + 200; y += 200) {
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
      for (let x = PAD + 14; x < W - PAD; x += 42) ctx.fillRect(x, y - 1.5, 3, 3);
    }
  }

  /* 좌우 여백 레일 */
  ctx.strokeStyle = alpha(C.line, .9);
  ctx.beginPath();
  ctx.moveTo(PAD, 0); ctx.lineTo(PAD, H);
  ctx.moveTo(W - PAD, 0); ctx.lineTo(W - PAD, H);
  ctx.stroke();

  /* 계기 모서리 표식 */
  ctx.strokeStyle = alpha(C.dust, .5);
  ctx.lineWidth = 1.4;
  for (const [cx, cy, sx, sy] of [[PAD, 8, 1, 1], [W - PAD, 8, -1, 1], [PAD, H - 8, 1, -1], [W - PAD, H - 8, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * 16, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * 16);
    ctx.stroke();
  }
}

export function skinColor() {
  const s = SKINS.find(k => k.id === S.skin) || SKINS[0];
  return s.col();
}
export function skinAccent() {
  const s = SKINS.find(k => k.id === S.skin) || SKINS[0];
  return s.col2 ? s.col2() : shade(s.col(), -.45);
}

/* 기체 실루엣 — 형식별로 다르다. 필드·타이틀 프리뷰·격납고 스와치가 전부 이 함수를 공유. */
export const HULL = {
  grail: [[0,-17],[7,2],[15,11],[5,9],[0,14],[-5,9],[-15,11],[-7,2]],
  bore:  [[0,-15],[5,-10],[5,-4],[17,-2],[18,10],[10,11],[8,5],[4,6],[2,14],
          [-2,14],[-4,6],[-8,5],[-10,11],[-18,10],[-17,-2],[-5,-4],[-5,-10]],
  whim:  [[0,-19],[4,-6],[16,8],[12,10],[3,4],[2,13],[-2,13],[-3,4],[-12,10],[-16,8],[-4,-6]],
  cage:  [[0,-18],[5,-11],[5,-6],[14,-6],[16,4],[9,4],[9,11],[3,8],[0,13],
          [-3,8],[-9,11],[-9,4],[-16,4],[-14,-6],[-5,-6],[-5,-11]]
};

/* 형식별 세부 — 패널 이음새 · 방열구 · 추진기 노즐 · 스텐실 데칼 위치 */
export const DETAIL = {
  grail: { seams: [[[-7,2],[7,2]], [[0,-14],[0,-2]]],
           vents: [[-11,6.5],[7,6.5]], nozzles: [[-3.6,11],[3.6,11]], canopy: -3, decal: [-5.5,5],
           accent: [[-14,8.5,6,2.2],[8,8.5,6,2.2],[-1.4,-13,2.8,5]] },
  bore:  { seams: [[[-17,1],[17,1]], [[-5,-7],[5,-7]], [[-9,5.5],[9,5.5]]],
           vents: [[-15.5,3],[11.5,3]], nozzles: [[-6.5,11.5],[0,13],[6.5,11.5]], canopy: -4, decal: [-4,-1],
           accent: [[-17,6.5,7,3],[10,6.5,7,3],[-2,-13,4,4]] },
  whim:  { seams: [[[-4,-5],[4,-5]], [[0,-17],[0,2]]],
           vents: [[-13.5,7.5],[9.5,7.5]], nozzles: [[-2.6,11.5],[2.6,11.5]], canopy: -6, decal: [-4,6],
           accent: [[-11,5.5,5,2],[6,5.5,5,2],[-1.2,-16,2.4,6]] },
  cage:  { seams: [[[-15,-2],[15,-2]], [[-5,-9],[5,-9]], [[-8,5.5],[8,5.5]]],
           vents: [[-15,-1],[11,-1]], nozzles: [[-6,10.5],[6,10.5]], canopy: -4, decal: [-4,7],
           accent: [[-15.5,0.5,5,2.6],[10.5,0.5,5,2.6],[-2,-15,4,4]] }
};

export function poly(g, pts, dx, dy) {
  g.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const x = pts[i][0] + (dx || 0), y = pts[i][1] + (dy || 0);
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}

/* 기체는 두 단계로 그린다.
   sc < 1  : 잔상·소형 표시용 경량 패스(단색 + 외곽선)
   sc >= 1 : 금속 그라디언트 + 내부 베벨 + 패널 이음새 + 노즐 발광 + 스텐실
   게임 중 플레이어(sc=1)와 프리뷰(sc 1.7~2.9)만 풀디테일을 탄다. */
export function drawFrame(g, id, x, y, sc, col, col2) {
  const pts = HULL[id] || HULL.grail;
  const d = DETAIL[id] || DETAIL.grail;
  const base = col || skinColor();
  const accent = col2 || (col ? shade(col, -.45) : skinAccent());
  const hi = sc >= 1;

  /* 구조선은 화면 좌표로 고정한다 — 모델 좌표로 두면 확대할수록 테두리가 같이 두꺼워져
     프리뷰에서 스티커처럼 보인다. 면(그라디언트·베벨)만 모델 좌표를 따른다. */
  const lw = 1.3 / sc;

  g.save();
  g.translate(x, y); g.scale(sc, sc);

  if (!hi) {
    g.fillStyle = base; poly(g, pts); g.fill();
    g.strokeStyle = C.fg; g.lineWidth = 1.2; g.stroke();
    g.restore();
    return;
  }

  /* 1. 접지 그림자 */
  g.fillStyle = alpha(C.fg, .18);
  poly(g, pts, 1.1, 1.8); g.fill();

  /* 2. 도장면 — 위에서 빛이 오는 금속 */
  const grd = g.createLinearGradient(0, -20, 0, 16);
  grd.addColorStop(0,   shade(base, .30));
  grd.addColorStop(.48, base);
  grd.addColorStop(1,   shade(base, -.34));
  g.fillStyle = grd;
  poly(g, pts); g.fill();

  g.save();
  poly(g, pts); g.clip();                       /* 이하 전부 선체 안쪽에만 */

  /* 3. 내부 베벨 — 위쪽 모서리만 살짝 서고, 아래쪽에 그늘이 고인다 */
  g.lineWidth = 1.6;
  g.strokeStyle = "rgba(255,255,255,.15)";
  poly(g, pts, -.8, -1.1); g.stroke();
  g.strokeStyle = "rgba(0,0,0,.28)";
  poly(g, pts, .8, 1.2); g.stroke();

  /* 4. 패널 이음새 — 파인 선 + 바로 아래 반사 한 줄 */
  g.lineWidth = lw * .85;
  for (const [a, b] of d.seams) {
    g.strokeStyle = "rgba(0,0,0,.5)";
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = "rgba(255,255,255,.26)";
    g.beginPath(); g.moveTo(a[0], a[1] + .8); g.lineTo(b[0], b[1] + .8); g.stroke();
  }

  /* 5. 방열구 — 슬릿 3줄 */
  for (const [vx, vy] of d.vents) {
    for (let i = 0; i < 3; i++) {
      g.fillStyle = "rgba(0,0,0,.4)";
      g.fillRect(vx, vy + i * 1.9, 4.4, 1);
    }
  }

  /* 6. 보조색 패널 — 2톤 도장. 게임 크기(1배)에선 오히려 산만해지므로
     프리뷰·카드 배율에서만 얹는다. */
  if (sc >= 1.6) {
    g.fillStyle = accent;
    for (const [ax, ay, aw, ah] of (d.accent || [])) g.fillRect(ax, ay, aw, ah);
  }

  /* 7. 스텐실 데칼 — 위험 표지 쉐브론 */
  g.fillStyle = alpha(C.fg, .3);
  for (let i = 0; i < 3; i++) g.fillRect(d.decal[0] + i * 2.2, d.decal[1], 1.2, 3.2);

  g.restore();

  /* 7. 추진기 — 파인 노즐 슬릿 안에서 빛이 샌다.
     하드웨어 색은 C.fg가 아니라 도장색 파생이어야 한다 — C.fg는 테마 따라 뒤집힌다. */
  for (const [nx, ny] of d.nozzles) {
    g.fillStyle = shade(base, -.66);
    g.beginPath(); g.ellipse(nx, ny, 1.7, .95, 0, 0, 6.283); g.fill();
    g.fillStyle = alpha(C.signal, .9);
    g.beginPath(); g.ellipse(nx, ny + .15, .85, .42, 0, 0, 6.283); g.fill();
  }

  /* 8. 외곽선 */
  poly(g, pts);
  g.strokeStyle = C.fg; g.lineWidth = lw; g.stroke();

  /* 9. 조종석 — 각진 캐노피. 타원으로 두면 얼굴처럼 읽힌다. */
  const cy = d.canopy;
  const cn = [[0, cy - 5], [2, cy - 2.4], [2.2, cy + 2], [0, cy + 3.8], [-2.2, cy + 2], [-2, cy - 2.4]];
  const cg = g.createLinearGradient(0, cy - 5, 0, cy + 4);
  cg.addColorStop(0, shade(C.drift, .34));
  cg.addColorStop(.5, shade(C.drift, -.14));
  cg.addColorStop(1, shade(C.drift, -.42));
  g.fillStyle = cg;
  poly(g, cn); g.fill();
  g.strokeStyle = alpha(C.fg, .75); g.lineWidth = lw * .8; g.stroke();
  /* 유리 반사 — 사선 한 줄 */
  g.save(); poly(g, cn); g.clip();
  g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = lw * 1.2;
  g.beginPath(); g.moveTo(-2.4, cy + .4); g.lineTo(1.4, cy - 4.4); g.stroke();
  g.restore();

  /* 10. 형식별 표식 */
  if (id === "bore") {
    /* 견인 포드 — 어두운 금속에 경고색 캡 */
    g.fillStyle = shade(base, -.52);
    g.fillRect(-13.4, -7, 3.2, 8); g.fillRect(10.2, -7, 3.2, 8);
    g.fillStyle = C.signal;
    g.fillRect(-13.4, -7, 3.2, 1.5); g.fillRect(10.2, -7, 3.2, 1.5);
    g.strokeStyle = alpha(C.fg, .5); g.lineWidth = lw * .8;
    g.strokeRect(-13.4, -7, 3.2, 8); g.strokeRect(10.2, -7, 3.2, 8);
  }
  if (id === "cage") {
    /* 육각 차폐 발생기 — 파인 자리에 앉은 발광 링 */
    const hexPts = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * 6.283 - Math.PI / 2;
      hexPts.push([Math.cos(a) * 5.4, Math.sin(a) * 5.4 + 4]);
    }
    poly(g, hexPts);
    g.fillStyle = "rgba(0,0,0,.34)"; g.fill();
    g.strokeStyle = C.drift; g.lineWidth = lw * 1.4; g.stroke();
    g.fillStyle = alpha(C.drift, .9);
    g.beginPath(); g.arc(0, 4, 1.5, 0, 6.283); g.fill();
  }
  if (id === "whim") {
    g.fillStyle = alpha(C.fg, .55);
    g.fillRect(-14.5, 7.4, 5.5, 1.3); g.fillRect(9, 7.4, 5.5, 1.3);
  }

  g.restore();
}
export function drawShip(g, x, y, sc, col) { drawFrame(g, S.frame, x, y, sc, col); }

/* ── 군체 실루엣 ────────────────────────────────
   수가 많으므로 기체와 같은 비용을 쓸 수 없다. 대신
   ① 외곽·베벨 경로를 Path2D로 한 번만 만들어 재사용하고
   ② 베벨은 전체 윤곽 대신 위/아래 오프셋 스트로크 2줄로 끝낸다. */
export const ESHAPE = {
  drone:  [[0, 12], [6, 4], [11, -5], [4, -3], [0, -7], [-4, -3], [-11, -5], [-6, 4]],
  weaver: [[0, 13], [7, 5], [13, 1], [8, -3], [0, -9], [-8, -3], [-13, 1], [-7, 5]],
  turret: Array.from({ length: 8 }, (_, i) => {
    const a = i / 8 * 6.283 + .39;
    return [Math.cos(a) * 13, Math.sin(a) * 13];
  }),
  rusher: [[0, 14], [5, 2], [9, -10], [3, -7], [-3, -7], [-9, -10], [-5, 2]]
};

export const ePath = {};
export function enemyPaths(kind) {
  let e = ePath[kind];
  if (!e) {
    const mk = (dx, dy) => {
      const p = new host.Path2D(), pts = ESHAPE[kind];
      pts.forEach(([x, y], i) => i ? p.lineTo(x + dx, y + dy) : p.moveTo(x + dx, y + dy));
      p.closePath();
      return p;
    };
    e = ePath[kind] = { base: mk(0, 0), hi: mk(-.7, -1), lo: mk(.7, 1.1) };
  }
  return e;
}

/* 그라디언트는 로컬 좌표계 기준이라 한 번 만들면 모든 군체가 공유한다.
   테마가 바뀌면 colorVer가 올라가고 그때만 다시 만든다. */
export let eGradVer = -1, eGrad = null;
export function enemyGrad() {
  if (eGradVer !== colorVer) {
    eGrad = ctx.createLinearGradient(0, -14, 0, 14);
    eGrad.addColorStop(0, shade(C.drift, .30));
    eGrad.addColorStop(.48, C.drift);
    eGrad.addColorStop(1, shade(C.drift, -.36));
    eGradVer = colorVer;
  }
  return eGrad;
}

export function drawEnemy(e) {
  const sp = enemyPaths(e.kind);
  const wrecked = e.hp < e.maxHp * .45;

  ctx.save();
  ctx.translate(e.x, e.y);

  ctx.fillStyle = enemyGrad();
  ctx.fill(sp.base);

  /* 경량 베벨 — 클립 안에서 오프셋 경로 2줄 */
  ctx.save();
  ctx.clip(sp.base);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "rgba(255,255,255,.16)"; ctx.stroke(sp.hi);
  ctx.strokeStyle = "rgba(0,0,0,.30)";       ctx.stroke(sp.lo);
  ctx.restore();

  /* 외곽선은 반투명으로 — C.fg 원색은 다크에서 순백이라 스티커처럼 뜬다.
     분리에 필요한 만큼만 남기고 장갑면이 주인공이 되게 한다. */
  ctx.strokeStyle = alpha(C.fg, .5); ctx.lineWidth = .9; ctx.stroke(sp.base);

  /* 형식별 장비 */
  if (e.kind === "drone") {
    ctx.fillStyle = shade(C.drift, -.6);
    ctx.fillRect(-7, -6, 3, 2.4); ctx.fillRect(4, -6, 3, 2.4);
  } else if (e.kind === "weaver") {
    ctx.fillStyle = shade(C.drift, -.55); ctx.fillRect(-2.4, -2, 4.8, 8);
    ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.moveTo(-12, 1); ctx.lineTo(12, 1); ctx.stroke();
    ctx.fillStyle = C.signal;
    ctx.beginPath(); ctx.arc(0, -4, 1.8, 0, 6.283); ctx.fill();      /* 광학 계통 */
  } else if (e.kind === "turret") {
    ctx.fillStyle = shade(C.drift, -.55);
    ctx.fillRect(-9.5, -2.4, 19, 4.8); ctx.fillRect(-2.4, 2, 4.8, 12);
    ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = .9;
    ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, 6.283); ctx.stroke();
  } else {
    ctx.fillStyle = shade(C.drift, -.6);
    ctx.fillRect(-6, -10, 2.6, 3); ctx.fillRect(3.4, -10, 2.6, 3);
  }

  /* 손상 — 장갑이 벗겨져 배선이 드러난다 (위치를 고정해 깜빡이지 않게) */
  if (wrecked) {
    ctx.globalAlpha = .5;
    ctx.fillStyle = shade(C.drift, -.75);
    ctx.beginPath(); ctx.arc(e.dmgX, e.dmgY, 4, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.signal;
    ctx.fillRect(e.dmgX - .7, e.dmgY - .7, 1.6, 1.6);
  }

  /* 피격 순간 — 맞았다는 사실이 파티클보다 먼저 읽혀야 한다 */
  if (e.flash > 0) {
    ctx.globalAlpha = Math.min(1, e.flash / .09) * .85;
    ctx.fillStyle = C.field;
    ctx.fill(sp.base);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/* AX 증폭 코어 — 육각 차폐를 겹쳐 두르고 송신을 되뿌린다 */
export function drawBoss(b) {
  /* 격파 진행도 — 0이면 온전, 1이면 소멸 직전 */
  const d = b.dead ? clamp(b.dieT / 1.3, 0, 1) : 0;

  ctx.save();
  ctx.translate(b.x, b.y);
  if (d) {
    ctx.globalAlpha = 1 - d;
    ctx.rotate(d * .7);
    ctx.scale(1 + d * .25, 1 + d * .25);
  }

  const hex = (r, rot) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * 6.283 - Math.PI / 2 + rot;
      const hx = Math.cos(a) * r, hy = Math.sin(a) * r;
      i ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy);
    }
    ctx.closePath();
  };

  /* 차폐층 3겹 — 강하 중엔 한 겹씩 전개되고, 격파 시엔 먼저 무너진다 */
  ctx.lineWidth = 1.5;
  const deploy = b.entered ? 3 : clamp(Math.floor((2.0 - b.warn) * 2.2), 0, 3);
  const shields = d ? Math.max(0, 3 - Math.ceil(d * 4)) : deploy;
  for (let k = 0; k < shields; k++) {
    const r = b.r + 16 + k * 15 + Math.sin(b.t * 2 + k) * 4;
    ctx.strokeStyle = alpha(C.drift, .34 - k * .08);
    hex(r, b.spin * (k % 2 ? .5 : -.5)); ctx.stroke();
  }

  ctx.rotate(Math.sin(b.t * .5) * .1);

  /* 외부 장갑판 — 금속 그라디언트 */
  const bg = ctx.createLinearGradient(0, -b.r, 0, b.r);
  bg.addColorStop(0,   shade(C.drift, .32));
  bg.addColorStop(.45, C.drift);
  bg.addColorStop(1,   shade(C.drift, -.38));
  ctx.fillStyle = bg;
  hex(b.r, 0); ctx.fill();

  /* 내부 베벨 */
  ctx.save();
  hex(b.r, 0); ctx.clip();
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.save(); ctx.translate(-3, -4); hex(b.r, 0); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = "rgba(0,0,0,.32)";       ctx.save(); ctx.translate(3, 4);   hex(b.r, 0); ctx.stroke(); ctx.restore();

  /* 장갑 분할선 — 6등분 */
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * 6.283 - Math.PI / 2;
    ctx.strokeStyle = "rgba(0,0,0,.45)";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * b.r, Math.sin(a) * b.r); ctx.stroke();
  }

  /* 방열 슬릿 */
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * 6.283 - Math.PI / 2 + .52;
    for (let k = 0; k < 3; k++) {
      const r0 = b.r * (.58 + k * .11), r1 = b.r * (.68 + k * .11);
      ctx.strokeStyle = "rgba(0,0,0,.5)";
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.strokeStyle = C.fg; ctx.lineWidth = 1.6; hex(b.r, 0); ctx.stroke();

  /* 송신 코어 — 안쪽이 파여 있고 그 바닥에서 빛이 올라온다 */
  ctx.fillStyle = shade(C.field, -.12); hex(b.r * .44, .52); ctx.fill();
  ctx.save(); hex(b.r * .44, .52); ctx.clip();
  ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.4)";
  ctx.save(); ctx.translate(-2, -2.6); hex(b.r * .44, .52); ctx.stroke(); ctx.restore();
  ctx.restore();
  ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2; hex(b.r * .44, .52); ctx.stroke();

  const pulse = .55 + .35 * Math.abs(Math.sin(b.t * 3));
  const cgr = ctx.createRadialGradient(0, 0, 0, 0, 0, b.r * .34);
  cgr.addColorStop(0, shade(C.signal, .45));
  cgr.addColorStop(.6, C.signal);
  cgr.addColorStop(1, alpha(C.signal, 0));
  ctx.fillStyle = cgr;
  ctx.beginPath(); ctx.arc(0, 0, b.r * .34 * pulse + b.r * .1, 0, 6.283); ctx.fill();

  ctx.restore();
}

export function drawShock() {
  const s = G.wave1;
  if (!s) return;
  const a = clamp(1 - s.r / 780, 0, 1);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.strokeStyle = alpha(C.moss, a * .9);
  ctx.lineWidth = 2 + a * 4;
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const ang = i / 6 * 6.283 - Math.PI / 2;
    const hx = Math.cos(ang) * s.r, hy = Math.sin(ang) * s.r;
    i ? ctx.lineTo(hx, hy) : ctx.moveTo(hx, hy);
  }
  ctx.stroke();
  ctx.strokeStyle = alpha(C.moss, a * .3);
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, s.r * .72, 0, 6.283); ctx.stroke();
  ctx.restore();
}

/* ── 타이틀 기체 프리뷰 ────────────────────────
   장착한 도장·궤적이 실제로 어떻게 보이는지 그대로 보여 준다.
   지우기는 타깃이 한다 — 앱은 매 프레임 새 그림을 뜨므로 지울 것이 없고,
   여기서 지우면 Skia 쪽에서 배경에 구멍을 뚫는 꼴이 된다. */
const tsParts = [];
let tsT = 0;
export function resetShipPreview() { tsParts.length = 0; tsT = 0; }

export function drawShipPreview(g, w, h, dt) {
  tsT += dt;
  const cx = w / 2, cy = h / 2 - 10 + Math.sin(tsT * 1.4) * 7;
  const sc = Math.min(w, h) / 100;             /* 240px 상자에서 2.4 — 웹의 기존 배율 그대로 */

  const tcol = S.trail === "ion" ? C.drift : S.trail === "bloom" ? C.moss : S.trail === "echo" ? C.dust : C.signal;
  if (S.trail === "echo") {
    for (let i = 1; i <= 8; i++) {
      g.globalAlpha = (1 - i / 9) * .2;
      drawShip(g, cx, cy + i * 5, sc * .875);
    }
    g.globalAlpha = 1;
  } else {
    if (tsParts.length < 90 && Math.random() < .9)
      tsParts.push({ x: cx + rand(-7, 7), y: cy + 26, vy: rand(70, 150), life: .55, max: .55, sz: S.trail === "bloom" ? rand(3, 6) : rand(2, 4.5) });
    for (let i = tsParts.length - 1; i >= 0; i--) {
      const q = tsParts[i];
      q.life -= dt; q.y += q.vy * dt;
      if (q.life <= 0) { tsParts.splice(i, 1); continue; }
      g.globalAlpha = q.life / q.max;
      g.fillStyle = tcol;
      if (S.trail === "bloom") { g.beginPath(); g.arc(q.x, q.y, q.sz / 2, 0, 6.283); g.fill(); }
      else g.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, S.trail === "ion" ? q.sz * 2.4 : q.sz);
    }
    g.globalAlpha = 1;
  }

  drawShip(g, cx, cy, sc);
}
