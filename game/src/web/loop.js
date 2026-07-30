/* ═══════════════════════════════════════════════
   11. 루프
   ═══════════════════════════════════════════════ */
/* 타이틀 기체 프리뷰 — 장착한 도장·궤적이 실제로 어떻게 보이는지 그대로 */
const tsCv = document.getElementById("title-ship");
const tsCtx = tsCv.getContext("2d");
const tsParts = [];
let tsT = 0;
function drawTitleShip(dt) {
  tsT += dt;
  const w = tsCv.width, h = tsCv.height;
  const cx = w / 2, cy = h / 2 - 10 + Math.sin(tsT * 1.4) * 7;

  tsCtx.clearRect(0, 0, w, h);

  const tcol = S.trail === "ion" ? C.drift : S.trail === "bloom" ? C.moss : S.trail === "echo" ? C.dust : C.signal;
  if (S.trail === "echo") {
    for (let i = 1; i <= 8; i++) {
      tsCtx.globalAlpha = (1 - i / 9) * .2;
      drawShip(tsCtx, cx, cy + i * 5, 2.1);
    }
    tsCtx.globalAlpha = 1;
  } else {
    if (tsParts.length < 90 && Math.random() < .9)
      tsParts.push({ x: cx + rand(-7, 7), y: cy + 26, vy: rand(70, 150), life: .55, max: .55, sz: S.trail === "bloom" ? rand(3, 6) : rand(2, 4.5) });
    for (let i = tsParts.length - 1; i >= 0; i--) {
      const q = tsParts[i];
      q.life -= dt; q.y += q.vy * dt;
      if (q.life <= 0) { tsParts.splice(i, 1); continue; }
      tsCtx.globalAlpha = q.life / q.max;
      tsCtx.fillStyle = tcol;
      if (S.trail === "bloom") { tsCtx.beginPath(); tsCtx.arc(q.x, q.y, q.sz / 2, 0, 6.283); tsCtx.fill(); }
      else tsCtx.fillRect(q.x - q.sz / 2, q.y - q.sz / 2, q.sz, S.trail === "ion" ? q.sz * 2.4 : q.sz);
    }
    tsCtx.globalAlpha = 1;
  }

  drawShip(tsCtx, cx, cy, 2.4);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  G.dt = dt;                              /* 배경 등 update() 밖에서 그리는 것들이 참조한다 */

  /* 히트스톱 — 세계만 멈추고 기체는 계속 움직인다.
     조작을 뺏으면 타격감이 아니라 렉으로 읽힌다. */
  if (G.screen === "play") {
    if (G.stop > 0) { G.stop -= dt; movePlayer(dt, stats()); }
    else update(dt);
  }
  else if (G.player) { G.t += dt; for (const q of G.parts) q.life -= dt * .2; }
  draw();
  if (G.screen === "title") drawTitleShip(dt); else tsParts.length = 0;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
