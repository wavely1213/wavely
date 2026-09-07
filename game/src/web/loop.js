/* ═══════════════════════════════════════════════
   11. 루프
   ═══════════════════════════════════════════════ */
/* 타이틀 기체 프리뷰 — 그리기 자체는 코어(core/draw.js)에 있다 */
const tsCv = document.getElementById("title-ship");
const tsCtx = tsCv.getContext("2d");
function drawTitleShip(dt) {
  tsCtx.clearRect(0, 0, tsCv.width, tsCv.height);
  drawShipPreview(tsCtx, tsCv.width, tsCv.height, dt);
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
  if (G.screen === "title") drawTitleShip(dt); else resetShipPreview();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
