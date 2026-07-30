import { clamp } from "./util.js";
/* 색 계산 — 값만 다루므로 코어에 둔다. 실제 색 자체는 host.color()가 준다. */


/* rgba 헬퍼 — hex만 다룬다 */
export function rgb(hex) {
  const h = hex.replace("#", "");
  return h.length === 3
    ? h.split("").map(c => parseInt(c + c, 16))
    : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function alpha(hex, a) { const n = rgb(hex); return "rgba(" + n[0] + "," + n[1] + "," + n[2] + "," + a + ")"; }

/* amt > 0 이면 밝게, < 0 이면 어둡게 — 금속 명암용 */
export function shade(hex, amt) {
  const f = c => clamp(Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)), 0, 255);
  return "rgb(" + rgb(hex).map(f).join(",") + ")";
}
