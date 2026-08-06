/* 신디사이저 — 파일도 오디오 장치도 모른다. 그래서 node 로 그대로 검사할 수 있다.
   web/sound.js 의 WebAudio 그래프를 같은 수식으로 옮긴 것이다. */

export const RATE = 22050;

/* ── 파형 ─────────────────────────────────────── */

/* 지수 감쇠 — WebAudio 의 exponentialRampToValueAtTime(.0001, t+dur) 과 같은 곡선 */
const decay = (t, dur, v0) => v0 * Math.pow(0.0001 / v0, t / dur);

function osc(type, phase) {
  const x = phase % 1;
  if (type === "square") return x < .5 ? 1 : -1;
  if (type === "sawtooth") return 2 * x - 1;
  if (type === "triangle") return 4 * Math.abs(x - .5) - 1;
  return Math.sin(phase * 6.283185307);
}

export function renderBlip(freq, dur, type, vol) {
  const n = Math.ceil(dur * RATE), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    out[i] = osc(type, ph) * decay(i / RATE, dur, vol);
    ph += freq / RATE;
  }
  return out;
}

export function renderSweep(f1, f2, dur, vol) {
  const n = Math.ceil(dur * RATE), out = new Float32Array(n);
  const k = Math.log(Math.max(20, f2) / f1);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    out[i] = osc("sawtooth", ph) * decay(t, dur, vol);
    ph += (f1 * Math.exp(k * t / dur)) / RATE;   /* 지수 주파수 램프 */
  }
  return out;
}

/* 2극 밴드패스 — RBJ 쿡북. WebAudio BiquadFilter("bandpass") 와 같은 계수다. */
export function renderNoise(freq, q, dur, vol) {
  const n = Math.ceil(dur * RATE), out = new Float32Array(n);
  const w0 = 2 * Math.PI * freq / RATE, cs = Math.cos(w0), sn = Math.sin(w0);
  const al = sn / (2 * q);
  const b0 = al, b1 = 0, b2 = -al, a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const x0 = Math.random() * 2 - 1;
    const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0 * decay(i / RATE, dur, vol);
  }
  return out;
}

/* ── WAV ─────────────────────────────────────── */
export function wav(samples) {
  const n = samples.length;
  const buf = new Uint8Array(44 + n * 2);
  const dv = new DataView(buf.buffer);
  const str = (off, s) => { for (let i = 0; i < s.length; i++) buf[off + i] = s.charCodeAt(i); };
  str(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); str(8, "WAVEfmt ");
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, RATE, true); dv.setUint32(28, RATE * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  str(36, "data"); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    dv.setInt16(44 + i * 2, v * 32767, true);
  }
  return buf;
}

export const mix = parts => {
  const n = Math.max(...parts.map(p => p.length));
  const out = new Float32Array(n);
  for (const p of parts) for (let i = 0; i < p.length; i++) out[i] += p[i];
  return out;
};

