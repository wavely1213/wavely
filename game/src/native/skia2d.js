/* Canvas2D 인터페이스를 Skia 위에 얹는 어댑터.
   core/draw.js 가 쓰는 기능만 구현한다 — 범용 폴리필이 아니다.

   왜 이렇게 하는가: 745줄짜리 아트를 앱에서 다시 그리는 대신,
   그리기 코드는 하나로 두고 밑바닥만 갈아 끼운다. 웹은 진짜 2D 컨텍스트,
   앱은 이 어댑터. 새 기체·새 이펙트를 한 번만 그리면 양쪽에 나온다.

   구현한 것
     상태   fillStyle strokeStyle globalAlpha lineWidth font textAlign textBaseline
     경로   beginPath moveTo lineTo closePath arc(부분호 포함) ellipse
     그리기 fill stroke fillRect strokeRect fillText clip
     변환   save restore translate rotate scale
     그 외  createLinearGradient createRadialGradient clearRect · Path2D

   구현하지 않은 것(코어가 안 쓴다): 곡선(bezier/quadratic), lineDash,
   그림자, 합성 모드, 패턴, drawImage.
   나중에 코어에서 쓰게 되면 여기서도 막히므로, 조용히 어긋나지 않는다.
*/

const DEG = 180 / Math.PI;

/* Skia 열거형 값. 패키지에서 import 하면 이 파일이 @shopify/react-native-skia 에
   묶여 헤드리스 검증(node + canvaskit-wasm)이 안 되므로 값만 적는다.
   출처: skia/types/{Paint,Canvas,ImageFilter}.js */
const FILL = 0, STROKE = 1;        // PaintStyle
const INTERSECT = 1;               // ClipOp
const CLAMP = 0;                   // TileMode
const BLEND_CLEAR = 0;             // BlendMode

/* Canvas2D 는 색을 문자열로 받는다. Skia.Color 가 #hex·rgb()·rgba() 를 모두 읽지만,
   알파는 우리가 따로 곱해야 하므로(globalAlpha) 여기서 미리 분리해 둔다. */
function parseColor(Skia, css) {
  if (typeof css !== "string") return { color: Skia.Color("#000000"), a: 1 };
  const m = /^rgba?\(([^)]+)\)$/i.exec(css.trim());
  if (m) {
    const n = m[1].split(",").map(v => parseFloat(v));
    const a = n.length > 3 ? n[3] : 1;
    return { color: Skia.Color(`rgb(${n[0] | 0},${n[1] | 0},${n[2] | 0})`), a };
  }
  return { color: Skia.Color(css), a: 1 };
}

class Gradient {
  constructor(kind, args) { this.kind = kind; this.args = args; this.stops = []; }
  addColorStop(t, css) { this.stops.push([t, css]); return this; }
}

export function makePath2D(Skia) {
  return class Path2D {
    constructor() { this._p = Skia.Path.Make(); this._started = false; }
    moveTo(x, y) { this._p.moveTo(x, y); this._started = true; }
    lineTo(x, y) { this._started ? this._p.lineTo(x, y) : (this._p.moveTo(x, y), this._started = true); }
    closePath() { this._p.close(); }
  };
}

export class Skia2D {
  /* @param Skia   react-native-skia 의 Skia 객체
     @param canvas SkCanvas
     @param font   (spec) => SkFont — "600 20px Family" 같은 CSS 서체 문자열을 받아 폰트를 준다 */
  constructor(Skia, canvas, font) {
    this.Skia = Skia;
    this.canvas = canvas;
    this._font = font || (() => null);

    this.fillStyle = "#000000";
    this.strokeStyle = "#000000";
    this.globalAlpha = 1;
    this.lineWidth = 1;
    this.font = "10px sans-serif";
    this.textAlign = "left";
    this.textBaseline = "alphabetic";

    this._path = Skia.Path.Make();
    this._open = false;
    this._stack = [];

    /* Paint 는 두 개만 만들어 계속 고쳐 쓴다 — 프레임당 수백 번 그리므로 */
    this._fp = Skia.Paint(); this._fp.setAntiAlias(true); this._fp.setStyle(FILL);
    this._sp = Skia.Paint(); this._sp.setAntiAlias(true); this._sp.setStyle(STROKE);
  }

  /* ── 상태 ── */
  save() {
    this._stack.push({
      fillStyle: this.fillStyle, strokeStyle: this.strokeStyle,
      globalAlpha: this.globalAlpha, lineWidth: this.lineWidth,
      font: this.font, textAlign: this.textAlign, textBaseline: this.textBaseline
    });
    this.canvas.save();
  }
  restore() {
    const s = this._stack.pop();
    if (s) Object.assign(this, s);
    this.canvas.restore();
  }
  translate(x, y) { this.canvas.translate(x, y); }
  rotate(rad) { this.canvas.rotate(rad * DEG, 0, 0); }
  scale(sx, sy) { this.canvas.scale(sx, sy); }
  /* setTransform 은 두지 않는다. Canvas2D 에서 이건 '절대' 변환이라
     Skia 의 save/restore 스택과 규칙이 어긋난다. 코어는 안 쓰고,
     화면 배율은 앱이 프레임을 시작할 때 canvas.scale() 로 한 번만 건다. */

  /* ── 경로 ── */
  beginPath() { this._path = this.Skia.Path.Make(); this._open = false; }
  moveTo(x, y) { this._path.moveTo(x, y); this._open = true; }
  lineTo(x, y) { this._open ? this._path.lineTo(x, y) : (this._path.moveTo(x, y), this._open = true); }
  closePath() { this._path.close(); }
  arc(x, y, r, a0, a1, ccw) {
    const oval = this.Skia.XYWHRect(x - r, y - r, r * 2, r * 2);
    let sweep = a1 - a0;
    if (Math.abs(sweep) >= 6.28) { this._path.addOval(oval); this._open = true; return; }
    /* Canvas2D 는 현재 점이 있으면 호의 시작점까지 직선을 잇고, 없으면 그냥 옮긴다.
       Skia 의 arcToOval(forceMoveTo=false) 가 정확히 같은 규칙이다. */
    if (ccw && sweep > 0) sweep -= 6.283185307;
    if (!ccw && sweep < 0) sweep += 6.283185307;
    this._path.arcToOval(oval, a0 * DEG, sweep * DEG, !this._open);
    this._open = true;
  }
  ellipse(x, y, rx, ry, rot, a0, a1) {
    if (Math.abs(a1 - a0) < 6.28 || rot) throw new Error("skia2d: 회전·부분 타원은 아직 구현하지 않았다");
    this._path.addOval(this.Skia.XYWHRect(x - rx, y - ry, rx * 2, ry * 2));
    this._open = true;
  }

  /* ── 페인트 준비 ── */
  _paint(style, stroke) {
    const p = stroke ? this._sp : this._fp;
    if (style instanceof Gradient) {
      p.setShader(this._shader(style));
      p.setColor(this.Skia.Color("#ffffff"));
      p.setAlphaf(this.globalAlpha);
    } else {
      p.setShader(null);
      const { color, a } = parseColor(this.Skia, style);
      p.setColor(color);
      p.setAlphaf(a * this.globalAlpha);   /* setColor 가 알파를 되돌리므로 순서가 중요하다 */
    }
    if (stroke) p.setStrokeWidth(this.lineWidth);
    return p;
  }
  _shader(g) {
    const { Skia } = this;
    const stops = g.stops.slice().sort((a, b) => a[0] - b[0]);
    const cols = stops.map(([, css]) => {
      const { color, a } = parseColor(Skia, css);
      /* Skia.Color 는 Float32Array [r,g,b,a] — 알파를 여기서 직접 얹는다 */
      const c = Float32Array.from(color); c[3] = a;
      return c;
    });
    const pos = stops.map(([t]) => t);
    if (g.kind === "linear") {
      const [x0, y0, x1, y1] = g.args;
      return Skia.Shader.MakeLinearGradient({ x: x0, y: y0 }, { x: x1, y: y1 }, cols, pos, CLAMP);
    }
    /* Canvas2D 의 방사 그라디언트는 동심원 두 개(r0..r1)를 쓰고 Skia 는 하나(0..r1)를 쓴다.
       코어의 두 곳 모두 중심이 같으므로, 정지점을 r1 기준으로 다시 재면 정확히 같아진다. */
    const [, , r0, cx, cy, r1] = g.args;
    const p2 = r1 > 0 ? pos.map(t => (r0 + t * (r1 - r0)) / r1) : pos;
    return Skia.Shader.MakeRadialGradient({ x: cx, y: cy }, r1, cols, p2, CLAMP);
  }

  /* ── 그리기 ── */
  fill(path) { this.canvas.drawPath(path ? path._p : this._path, this._paint(this.fillStyle, false)); }
  stroke(path) { this.canvas.drawPath(path ? path._p : this._path, this._paint(this.strokeStyle, true)); }
  fillRect(x, y, w, h) { this.canvas.drawRect(this.Skia.XYWHRect(x, y, w, h), this._paint(this.fillStyle, false)); }
  strokeRect(x, y, w, h) { this.canvas.drawRect(this.Skia.XYWHRect(x, y, w, h), this._paint(this.strokeStyle, true)); }
  clearRect(x, y, w, h) {
    const p = this.Skia.Paint();
    p.setColor(this.Skia.Color("#00000000"));
    p.setBlendMode(BLEND_CLEAR);
    this.canvas.drawRect(this.Skia.XYWHRect(x, y, w, h), p);
  }
  clip(path) {
    this.canvas.clipPath(path ? path._p : this._path, INTERSECT, true);
  }

  fillText(text, x, y) {
    const f = this._font(this.font);
    if (!f) return;
    let tx = x, ty = y;
    if (this.textAlign === "center" || this.textAlign === "right") {
      const w = f.getGlyphWidths(f.getGlyphIDs(text)).reduce((s, v) => s + v, 0);
      tx -= this.textAlign === "center" ? w / 2 : w;
    }
    /* Skia 의 drawText 는 알파벳 기준선에 그린다. Canvas2D 의 나머지 기준선은
       폰트 메트릭으로 옮겨 준다 — 계기판 숫자를 상자 한가운데 놓을 때 필요하다. */
    if (this.textBaseline !== "alphabetic") {
      const m = f.getMetrics();
      if (this.textBaseline === "middle") ty -= (m.ascent + m.descent) / 2;
      else if (this.textBaseline === "top") ty -= m.ascent;
      else if (this.textBaseline === "bottom") ty -= m.descent;
    }
    this.canvas.drawText(text, tx, ty, this._paint(this.fillStyle, false), f);
  }

  /* ── 그라디언트 ── */
  createLinearGradient(x0, y0, x1, y1) { return new Gradient("linear", [x0, y0, x1, y1]); }
  createRadialGradient(x0, y0, r0, x1, y1, r1) { return new Gradient("radial", [x0, y0, r0, x1, y1, r1]); }
}
