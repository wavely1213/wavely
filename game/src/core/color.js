/* 색 — 의미에 1:1로 고정된 10개 토큰.
   값 자체는 타깃이 넣어 준다 (웹은 CSS 변수, 앱은 테마 객체).
   코어는 이름만 알고, 이름과 의미의 대응은 여기가 유일한 정의다. */

import { clamp } from "./util.js";

export const COLOR_KEYS = ["ground", "field", "fg", "dim", "line", "signal", "drift", "moss", "dust", "bad"];

/* 참조를 바꾸지 않고 안을 갈아 끼운다 — 테마가 바뀌어도 import 한 쪽이 다시 안 읽어도 된다 */
export const C = {};
for (const k of COLOR_KEYS) C[k] = "#888";

/* 캐시한 그라디언트를 언제 버릴지 알려주는 값 */
export let colorVer = 0;

export function setColors(map) {
  for (const k of COLOR_KEYS) C[k] = map[k] || "#888";
  colorVer++;
}

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
