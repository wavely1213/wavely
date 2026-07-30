/* ═══════════════════════════════════════════════
   2. 색 (CSS 변수 → 캔버스)
   ═══════════════════════════════════════════════ */
const C = {};
const COLOR_KEYS = ["ground", "field", "fg", "dim", "line", "signal", "drift", "moss", "dust", "bad"];
let colorVer = 0;                     /* 캐시한 그라디언트를 언제 버릴지 알려주는 값 */
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of COLOR_KEYS) C[k] = cs.getPropertyValue("--c-" + k).trim() || "#888";
  colorVer++;
}
readColors();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColors);
new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
