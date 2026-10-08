// 음량 측정: ITU-R BS.1770-4 통합 음량(LUFS)과 트루 피크(4배 오버샘플링 추정).

function biquadCoefs(type, fc, gainDb, q, rate) {
  const A = 10 ** (gainDb / 40);
  const w0 = (2 * Math.PI * fc) / rate;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  let b0; let b1; let b2; let a0; let a1; let a2;
  if (type === 'highshelf') {
    const s = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) + (A - 1) * cos + s);
    b1 = -2 * A * ((A - 1) + (A + 1) * cos);
    b2 = A * ((A + 1) + (A - 1) * cos - s);
    a0 = (A + 1) - (A - 1) * cos + s;
    a1 = 2 * ((A - 1) - (A + 1) * cos);
    a2 = (A + 1) - (A - 1) * cos - s;
  } else {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}

function runBiquad(x, [b0, b1, b2, a1, a2]) {
  const y = new Float32Array(x.length);
  let x1 = 0; let x2 = 0; let y1 = 0; let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

// K 가중 필터 (pyloudnorm과 같은 계수식)
function kWeight(x, rate) {
  const shelf = biquadCoefs('highshelf', 1500, 4.0, 1 / Math.SQRT2, rate);
  const hp = biquadCoefs('highpass', 38, 0, 0.5, rate);
  return runBiquad(runBiquad(x, shelf), hp);
}

// channels: Float32Array[] (스테레오면 L, R). 반환: LUFS (무음이면 -Infinity)
export function integratedLoudness(channels, rate) {
  const weighted = channels.map((c) => kWeight(c, rate));
  const block = Math.round(0.4 * rate);
  const hop = Math.round(0.1 * rate);
  const n = channels[0].length;
  const z = [];
  for (let start = 0; start + block <= n; start += hop) {
    let sum = 0;
    weighted.forEach((w) => {
      let s = 0;
      for (let i = start; i < start + block; i++) s += w[i] * w[i];
      sum += s / block;
    });
    z.push(sum);
  }
  const lk = (v) => -0.691 + 10 * Math.log10(v);
  const abs = z.filter((v) => lk(v) > -70);
  if (!abs.length) return -Infinity;
  const relGate = lk(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const rel = abs.filter((v) => lk(v) > relGate);
  if (!rel.length) return -Infinity;
  return lk(rel.reduce((a, b) => a + b, 0) / rel.length);
}

// 4배 오버샘플링용 보간 필터 (Hann 창 sinc, 위상당 32탭). 12탭은 고음이 많은 믹스에서 피크를 1dB 넘게 놓쳤다
const TAPS = 16;
const PHASES = [0.25, 0.5, 0.75].map((p) => {
  const h = [];
  for (let j = -TAPS + 1; j <= TAPS; j++) {
    const x = p - j;
    const sinc = Math.sin(Math.PI * x) / (Math.PI * x);
    const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / TAPS);
    h.push(sinc * w);
  }
  return h;
});

// 샘플마다 [n, n+1) 구간의 트루 피크 추정값 (채널 중 최댓값)
export function truePeakEnvelope(channels) {
  const n = channels[0].length;
  const out = new Float32Array(n);
  channels.forEach((x) => {
    for (let i = 0; i < n; i++) {
      let peak = Math.abs(x[i]);
      if (i >= TAPS - 1 && i + TAPS < n) {
        for (let p = 0; p < 3; p++) {
          const h = PHASES[p];
          let v = 0;
          for (let k = 0; k < h.length; k++) v += x[i - TAPS + 1 + k] * h[k];
          const a = Math.abs(v);
          if (a > peak) peak = a;
        }
      }
      if (peak > out[i]) out[i] = peak;
    }
  });
  return out;
}

export function maxOf(arr) {
  let m = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
}

export const toDb = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
export const fromDb = (db) => 10 ** (db / 20);
