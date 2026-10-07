// 마스터링 계산 (오디오 API 없이 숫자만): 리미터, 음량 맞춤 반복, 앞뒤 정리.
// 화면이 멈추지 않게 Web Worker(dsp-worker.js)에서 돌고, 워커를 못 쓰면 화면 스레드에서 돈다.
import { integratedLoudness, truePeakEnvelope, maxOf, toDb, fromDb } from './loudness.js';

export const OUTPUT_RATE = 44100;
const CEILING_DB = -1; // 트루 피크 한도 (dBTP)
const MAX_PASSES = 8;
const MAX_REDUCTION_DB = 12; // 이보다 많이 누르면 목표 음량을 포기하고 알린다

function maxReductionDb(curve) {
  let m = 1;
  for (let i = 0; i < curve.length; i++) if (curve[i] < m) m = curve[i];
  return -toDb(m);
}

// 앞뒤 lookahead만큼의 최솟값 (단조 덱)
function slidingMin(x, radius) {
  const n = x.length;
  const out = new Float32Array(n);
  const dq = new Int32Array(n);
  let head = 0; let tail = 0;
  for (let i = 0; i < n + radius; i++) {
    if (i < n) {
      while (tail > head && x[dq[tail - 1]] >= x[i]) tail--;
      dq[tail++] = i;
    }
    const c = i - radius;
    if (c >= 0) {
      while (dq[head] < c - radius) head++;
      out[c] = x[dq[head]];
    }
  }
  return out;
}

function boxAverage(x, width) {
  const n = x.length;
  const half = Math.floor(width / 2);
  const pre = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + x[i];
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - half);
    const b = Math.min(n, i + half + 1);
    out[i] = (pre[b] - pre[a]) / (b - a);
  }
  return out;
}

// 리미터 게인 곡선: 어느 샘플도 한도를 넘지 않게, 미리 보고(1.5ms) 부드럽게 줄이고 80ms에 걸쳐 풀어 준다
function limiterGain(tpPre, gain, ceiling, rate) {
  const n = tpPre.length;
  const req = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = tpPre[i] * gain;
    req[i] = p > ceiling ? ceiling / p : 1;
  }
  const look = Math.round(0.0015 * rate);
  const smooth = boxAverage(slidingMin(req, look), look);
  const rel = 1 - Math.exp(-1 / (0.08 * rate));
  let env = 1;
  for (let i = 0; i < n; i++) {
    const target = smooth[i];
    env = target < env ? target : env + (target - env) * rel;
    smooth[i] = env;
  }
  return smooth;
}

function applyGain(channels, gain, curve) {
  return channels.map((c) => {
    const out = new Float32Array(c.length);
    for (let i = 0; i < c.length; i++) out[i] = c[i] * gain * curve[i];
    return out;
  });
}

// 앞뒤 무음 정리 + 페이드. 유통사는 앞쪽 긴 무음을 싫어한다.
// trim: 앞은 소리 시작 50ms 전부터, 뒤는 소리 끝 0.5초 뒤까지 남긴다. fadeOut: 끝 페이드 길이(초).
const SILENCE = 0.001; // -60 dBFS
export function finishEdges(channels, rate, { trim = true, fadeOut = 0 } = {}) {
  const n = channels[0].length;
  let start = 0;
  let end = n;
  if (trim) {
    const loud = (i) => channels.some((c) => Math.abs(c[i]) > SILENCE);
    let first = 0;
    while (first < n && !loud(first)) first++;
    let last = n - 1;
    while (last > first && !loud(last)) last--;
    if (first >= n) return { channels, trimmedStart: 0, trimmedEnd: 0 };
    start = Math.max(0, first - Math.round(0.05 * rate));
    end = Math.min(n, last + Math.round(0.5 * rate));
  }
  const out = channels.map((c) => c.slice(start, end));
  const len = out[0].length;
  const fadeIn = Math.min(len, Math.round(0.01 * rate)); // 잘린 자리 딸깍 소리 방지
  const fade = Math.min(len, Math.round(Math.max(fadeOut, trim ? 0.05 : 0) * rate));
  out.forEach((c) => {
    if (start > 0) for (let i = 0; i < fadeIn; i++) c[i] *= i / fadeIn;
    for (let i = 0; i < fade; i++) c[len - 1 - i] *= (i / fade) ** (fadeOut ? 2 : 1);
  });
  return { channels: out, trimmedStart: start / rate, trimmedEnd: (n - end) / rate };
}

export function measure(channels, rate) {
  return { lufs: integratedLoudness(channels, rate), peak: toDb(maxOf(truePeakEnvelope(channels))) };
}

// src: 원본 채널(원래 샘플레이트), toned: EQ·컴프를 거친 44.1kHz 채널
export function processMaster({ src, srcRate, toned, target = -14, trim = true, fadeOut = 0 }, onStep = () => {}) {
  onStep('원본 음량 재는 중');
  const before = measure(src, srcRate);
  onStep('피크 분석 중');
  const tpPre = truePeakEnvelope(toned);
  const ceiling = fromDb(CEILING_DB);
  let gainDb = target - integratedLoudness(toned, OUTPUT_RATE);
  let out;
  let curve;
  let reached = false;
  // 리미터가 음량을 깎으므로 여러 번 다시 맞춘다. 리미터가 12dB 넘게 눌러야 하면 소리가 뭉개지므로 거기서 멈춘다.
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    onStep(`음량 맞추는 중 (${pass + 1})`);
    curve = limiterGain(tpPre, fromDb(gainDb), ceiling, OUTPUT_RATE);
    out = applyGain(toned, fromDb(gainDb), curve);
    const l = integratedLoudness(out, OUTPUT_RATE);
    if (!Number.isFinite(l) || Math.abs(l - target) < 0.2) { reached = Number.isFinite(l); break; }
    if (l < target && maxReductionDb(curve) >= MAX_REDUCTION_DB) break;
    gainDb += target - l;
  }
  onStep('앞뒤 정리·최종 확인');
  const edges = finishEdges(out, OUTPUT_RATE, { trim, fadeOut });
  out = edges.channels;
  let peak = maxOf(truePeakEnvelope(out));
  if (peak > ceiling) {
    const scale = ceiling / peak;
    out.forEach((c) => { for (let i = 0; i < c.length; i++) c[i] *= scale; });
    peak = ceiling;
  }
  const after = { lufs: integratedLoudness(out, OUTPUT_RATE), peak: toDb(peak) };
  if (Math.abs(after.lufs - target) < 0.5) reached = true;
  return { channels: out, rate: OUTPUT_RATE, before, after, maxReduction: maxReductionDb(curve), gainDb, reached, trimmedStart: edges.trimmedStart, trimmedEnd: edges.trimmedEnd };
}