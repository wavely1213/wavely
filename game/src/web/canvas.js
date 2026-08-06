/* ═══════════════════════════════════════════════
   5. 캔버스 · 입력
   ═══════════════════════════════════════════════ */
const cv = document.getElementById("cv");
const scope = document.getElementById("scope");

/* 그리기 코어에 진짜 2D 컨텍스트를 꽂는다 — 앱에서는 여기에 Skia 어댑터가 들어간다 */
const g2d = cv.getContext("2d");
setCtx(g2d);

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr;
  g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  g2d.imageSmoothingEnabled = true;
}
resize();
window.addEventListener("resize", resize);

/* P · keys 는 코어(core/input.js)의 것 — 여기서는 브라우저 이벤트를 그 값에 옮겨 담기만 한다 */
function toField(ev) {
  const r = scope.getBoundingClientRect();
  return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H };
}
scope.addEventListener("pointerdown", e => {
  if (G.screen !== "play") return;
  scope.setPointerCapture(e.pointerId);
  const p = toField(e);
  P.active = true; P.tx = p.x; P.ty = p.y - (e.pointerType === "touch" ? 52 : 0);
});
scope.addEventListener("pointermove", e => {
  if (!P.active) return;
  const p = toField(e);
  P.tx = p.x; P.ty = p.y - (e.pointerType === "touch" ? 52 : 0);
});
const release = () => { P.active = false; };
scope.addEventListener("pointerup", release);
scope.addEventListener("pointercancel", release);

addEventListener("keydown", e => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  keys.add(e.key.toLowerCase());
  if (e.key === " " && !e.repeat && G.screen === "play") useBomb();
  if (e.key === "Escape") { if (G.screen === "play") pause(); else if (G.screen === "pause") resume(); }
});
addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => { keys.clear(); P.active = false; if (G.screen === "play") pause(); });
