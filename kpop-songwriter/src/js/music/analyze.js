// 레퍼런스 오디오 분석 (브라우저 안에서만, 파일은 어디에도 올리지 않음).
// 빠르기(BPM), 키, 구간별 에너지, 저음 비중, 밝기를 어림한다.
import { NOTE_NAMES } from './theory.js';

const RATE = 11025;
const MAX_SECONDS = 240;

// 대역별로 거른 신호 (11025Hz 모노): 전체, 저음(150Hz 아래), 고음(2.5kHz 위)
async function bands(decoded) {
  const dur = Math.min(decoded.duration, MAX_SECONDS);
  const render = async (type, hz) => {
    const off = new OfflineAudioContext(1, Math.ceil(dur * RATE), RATE);
    const src = off.createBufferSource();
    src.buffer = decoded;
    let node = src;
    if (type) {
      const f = off.createBiquadFilter();
      f.type = type;
      f.frequency.value = hz;
      node = src.connect(f);
    }
    node.connect(off.destination);
    src.start(0);
    const out = await off.startRendering();
    return out.getChannelData(0);
  };
  const [full, low, high] = await Promise.all([render(null), render('lowpass', 150), render('highpass', 2500)]);
  return { full, low, high, duration: decoded.duration };
}

async function resample(file) {
  const raw = await file.arrayBuffer();
  const tmp = new OfflineAudioContext(1, 1, 44100);
  return bands(await tmp.decodeAudioData(raw));
}

function rms(x, from, to) {
  let s = 0;
  for (let i = from; i < to; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, to - from));
}

function estimateBpm(x) {
  const hop = 128;
  const frames = Math.floor(x.length / hop);
  const env = new Float32Array(frames);
  for (let f = 0; f < frames; f++) env[f] = rms(x, f * hop, f * hop + hop);
  const onset = new Float32Array(frames);
  for (let f = 1; f < frames; f++) onset[f] = Math.max(0, env[f] - env[f - 1]);
  const fps = RATE / hop;
  let best = 0;
  let bestLag = 0;
  const scores = [];
  for (let bpm = 70; bpm <= 180; bpm += 0.5) {
    const lag = (60 / bpm) * fps;
    const l0 = Math.floor(lag);
    const frac = lag - l0;
    let s = 0;
    for (let f = 0; f + l0 + 1 < frames; f++) s += onset[f] * (onset[f + l0] * (1 - frac) + onset[f + l0 + 1] * frac);
    scores.push([bpm, s]);
    if (s > best) { best = s; bestLag = bpm; }
  }
  // 절반·두 배 템포 혼동 보정: 85~170 사이를 우선
  let bpm = bestLag;
  const scoreAt = (b) => (scores.find(([x]) => Math.abs(x - b) < 0.3) || [0, 0])[1];
  if (bpm < 85 && scoreAt(bpm * 2) > best * 0.6) bpm *= 2;
  if (bpm > 170 && scoreAt(bpm / 2) > best * 0.6) bpm /= 2;
  return Math.round(bpm);
}

// Goertzel로 12음 크로마를 구하고 Krumhansl 키 프로필과 비교
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function goertzel(x, start, n, freq) {
  const k = 2 * Math.cos((2 * Math.PI * freq) / RATE);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
    const s = x[start + i] * w + k * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return s1 * s1 + s2 * s2 - k * s1 * s2;
}

function corr(a, b) {
  const ma = a.reduce((s, v) => s + v, 0) / 12;
  const mb = b.reduce((s, v) => s + v, 0) / 12;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < 12; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db || 1);
}

function estimateKey(x) {
  const n = 4096;
  const chroma = new Array(12).fill(0);
  const hopSec = 0.5;
  for (let start = 0; start + n < x.length; start += Math.floor(hopSec * RATE)) {
    if (rms(x, start, start + n) < 0.01) continue;
    for (let midi = 45; midi < 84; midi++) {
      const f = 440 * 2 ** ((midi - 69) / 12);
      chroma[midi % 12] += Math.sqrt(goertzel(x, start, n, f));
    }
  }
  let best = { score: -2 };
  for (let r = 0; r < 12; r++) {
    const rot = chroma.map((_, i) => chroma[(i + r) % 12]);
    const sMaj = corr(rot, MAJOR_PROFILE);
    const sMin = corr(rot, MINOR_PROFILE);
    if (sMaj > best.score) best = { score: sMaj, root: r, mode: 'major' };
    if (sMin > best.score) best = { score: sMin, root: r, mode: 'minor' };
  }
  return { root: best.root, mode: best.mode, confidence: Math.max(0, Math.min(1, best.score)) };
}

function energyCurve(x) {
  const win = RATE; // 1초
  const out = [];
  for (let i = 0; i + win <= x.length; i += win) out.push(rms(x, i, i + win));
  const max = Math.max(...out, 1e-6);
  return out.map((v) => Math.round((v / max) * 100) / 100);
}

// 에너지가 크게 뛰는 지점 (드롭·코러스 진입 후보)
function jumps(curve) {
  const res = [];
  for (let i = 4; i < curve.length; i++) {
    const before = (curve[i - 4] + curve[i - 3] + curve[i - 2]) / 3;
    const after = curve[i];
    if (after - before > 0.25 && after > 0.7 && (!res.length || i - res[res.length - 1] > 12)) res.push(i);
  }
  return res.slice(0, 6);
}

function zeroCrossRate(x) {
  let z = 0;
  for (let i = 1; i < x.length; i++) if ((x[i] >= 0) !== (x[i - 1] >= 0)) z += 1;
  return z / x.length;
}

export async function analyzeAudio(file, onStep = () => {}) {
  onStep('파일 읽는 중');
  const { full, low, high, duration } = await resample(file);
  onStep('빠르기 찾는 중');
  await new Promise((r) => setTimeout(r, 0));
  const bpm = estimateBpm(full);
  onStep('키 찾는 중');
  await new Promise((r) => setTimeout(r, 0));
  const key = estimateKey(full);
  const curve = energyCurve(full);
  const { bass: bassRatio, high: highRatio } = ratios(full, low, high);
  const zcr = zeroCrossRate(full);
  return {
    duration: Math.round(duration),
    bpm,
    root: key.root,
    mode: key.mode,
    keyConfidence: Math.round(key.confidence * 100) / 100,
    energy: curve,
    drops: jumps(curve),
    bass: Math.round(bassRatio * 100) / 100,
    brightness: Math.round(zcr * 1000) / 1000,
    high: highRatio,
  };
}

// 저음·고음 대역이 전체에서 차지하는 비율 (RMS 비)
function ratios(full, low, high) {
  const all = Math.max(1e-6, rms(full, 0, full.length));
  return { bass: Math.round((rms(low, 0, low.length) / all) * 1000) / 1000, high: Math.round((rms(high, 0, high.length) / all) * 1000) / 1000 };
}

// 이미 디코딩한 소리의 음색(저음·고음 비율)만 빠르게 (마스터링 탭의 원본용)
export async function toneOf(buffer) {
  const { full, low, high } = await bands(buffer);
  return ratios(full, low, high);
}

// 숫자를 쉬운 말로
export function describeAnalysis(a) {
  const bass = a.bass > 0.6 ? '저음이 아주 강함 (808·서브 베이스 중심)' : a.bass > 0.4 ? '저음이 탄탄한 편' : '저음이 가벼운 편';
  const bright = a.brightness > 0.12 ? '밝고 반짝이는 소리' : a.brightness > 0.07 ? '밝기 보통' : '어둡고 따뜻한 소리';
  const mm = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return {
    key: `${NOTE_NAMES[a.root]} ${a.mode === 'minor' ? 'minor (어두운 느낌)' : 'major (밝은 느낌)'}${a.keyConfidence < 0.5 ? ' · 확신 낮음' : ''}`,
    bass,
    bright,
    drops: a.drops.length ? a.drops.map(mm).join(', ') : '뚜렷한 지점 없음',
    length: mm(a.duration),
  };
}
