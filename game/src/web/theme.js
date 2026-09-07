/* ═══════════════════════════════════════════════
   2. 색 (CSS 변수 → 코어 색표)
   ═══════════════════════════════════════════════ */
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const map = {};
  for (const k of COLOR_KEYS) map[k] = cs.getPropertyValue("--c-" + k).trim();
  setColors(map);
}
readColors();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColors);
new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
