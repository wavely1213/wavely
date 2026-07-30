/* 코어의 그리기는 서체를 CSS 문자열로 말한다 — "600 26px Poppins, sans-serif".
   Skia 는 굵기와 크기를 따로 받으므로 여기서 풀어 준다.

   굵기를 흘리면 조용히 틀린다: 브라우저는 굵은 자면이 없으면 합성 볼드를 만들어 주고,
   Skia 는 그냥 보통 자면으로 그린다. 같은 코드가 두 화면에서 다른 무게로 나온다. */
import { Skia } from "@shopify/react-native-skia";

const FontWeight = { Normal: 400, Medium: 500, SemiBold: 600, Bold: 700 };

let mgr;
const faces = new Map();          // weight -> SkTypeface
const fonts = new Map();          // "weight:size" -> SkFont

function faceFor(weight) {
  if (faces.has(weight)) return faces.get(weight);
  let tf = null;
  try {
    if (!mgr) mgr = Skia.FontMgr.System();
    tf = mgr.matchFamilyStyle(mgr.getFamilyName(0), { weight });
  } catch { tf = null; }
  faces.set(weight, tf);
  return tf;
}

/* @param spec "600 26px ..." · "10px ..." 형태의 CSS font 문자열
   @returns SkFont | null  (시스템 폰트를 못 찾으면 null — 그리기는 글자만 건너뛴다) */
export function fontFor(spec) {
  const m = /^(?:(\d{3})\s+)?(\d+(?:\.\d+)?)px/.exec(spec) || [];
  const weight = m[1] ? Number(m[1]) : FontWeight.Normal;
  const size = m[2] ? parseFloat(m[2]) : 10;
  const key = weight + ":" + size;
  if (fonts.has(key)) return fonts.get(key);
  const tf = faceFor(weight);
  const f = tf ? Skia.Font(tf, size) : null;
  fonts.set(key, f);
  return f;
}
