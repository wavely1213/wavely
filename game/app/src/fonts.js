/* 코어의 그리기는 서체를 CSS 문자열로 말한다 — `"600 26px Poppins, sans-serif"`.
   Skia 는 가족·굵기·크기를 따로 받으므로 여기서 풀어 준다.

   두 가지를 흘리기 쉽다.
   - **가족**: 시스템 폰트 목록의 0번을 그냥 쓰면 기기가 정하는 대로 끌려간다.
     스택을 순서대로 훑어 실제로 있는 첫 가족을 고른다.
   - **굵기**: 브라우저는 굵은 자면이 없으면 합성 볼드를 만들어 주지만 Skia 는 안 만든다.
     같은 코드가 두 화면에서 다른 무게로 나온다. */
import { Skia } from "@shopify/react-native-skia";

const FontWeight = { Normal: 400, SemiBold: 600, Bold: 700 };

let mgr = undefined;
let available = null;             // 이 기기에 실제로 있는 가족 이름들
const faces = new Map();          // "가족|굵기" -> SkTypeface
const fonts = new Map();          // "가족|굵기|크기" -> SkFont

function manager() {
  if (mgr === undefined) {
    try { mgr = Skia.FontMgr.System(); } catch { mgr = null; }
    if (mgr) {
      available = new Set();
      try {
        for (let i = 0; i < mgr.countFamilies(); i++) available.add(mgr.getFamilyName(i));
      } catch { available = null; }
    }
  }
  return mgr;
}

/* CSS 서체 스택에서 이 기기에 있는 첫 가족. 하나도 없으면 시스템 기본. */
function familyFor(stack) {
  const m = manager();
  if (!m) return null;
  for (const raw of stack.split(",")) {
    const name = raw.trim().replace(/^["']|["']$/g, "");
    if (!name || /^(sans-serif|serif|monospace|system-ui|ui-monospace)$/.test(name)) continue;
    if (!available || available.has(name)) return name;
  }
  try { return m.getFamilyName(0); } catch { return null; }
}

function faceFor(family, weight) {
  const key = family + "|" + weight;
  if (faces.has(key)) return faces.get(key);
  let tf = null;
  try { tf = manager()?.matchFamilyStyle(family, { weight }) ?? null; } catch { tf = null; }
  faces.set(key, tf);
  return tf;
}

/* @param spec `"600 26px Poppins, sans-serif"` · `"10px ..."` 형태의 CSS font 문자열
   @returns SkFont | null  (시스템 폰트를 못 찾으면 null — 그때는 글자만 건너뛴다) */
export function fontFor(spec) {
  const m = /^(?:(\d{3})\s+)?(\d+(?:\.\d+)?)px\s*(.*)$/.exec(spec) || [];
  const weight = m[1] ? Number(m[1]) : FontWeight.Normal;
  const size = m[2] ? parseFloat(m[2]) : 10;
  const family = familyFor(m[3] || "");
  if (!family) return null;

  const key = family + "|" + weight + "|" + size;
  if (fonts.has(key)) return fonts.get(key);
  const tf = faceFor(family, weight);
  const f = tf ? Skia.Font(tf, size) : null;
  fonts.set(key, f);
  return f;
}
