// 마스터링: 톤 보정(EQ) → 글루 컴프레서 → 목표 음량(LUFS)으로 맞춤 → 트루 피크 리미터 → 44.1kHz.
import { integratedLoudness, truePeakEnvelope, maxOf, toDb, fromDb } from './loudness.js';

export const MASTER_PRESETS = {
  natural: { name: '자연스럽게', low: 0, mud: 0, presence: 0.5, air: 1, comp: { threshold: -20, ratio: 1.6 } },
  kpop: { name: '밝고 선명하게 (K-pop)', low: 1.5, mud: -1.5, presence: 2, air: 3, comp: { threshold: -22, ratio: 2.2 } },
  bass: { name: '저음 강하게', low: 3.5, mud: -1, presence: 0.5, air: 1.5, comp: { threshold: -22, ratio: 2 } },
  vocal: { name: '보컬 또렷하게', low: 0, mud: -2, presence: 3, air: 2, comp: { threshold: -20, ratio: 1.8 } },
};

export const LOUDNESS_TARGETS = [
  { value: -14, name: '-14 LUFS · 스트리밍 표준 (권장)', note: 'Spotify·YouTube 기준. 플랫폼이 소리를 줄이지 않아 다이내믹이 그대로 남아요.' },
  { value: -11, name: '-11 LUFS · 조금 크게', note: '대부분의 팝 음원 정도. 스트리밍에선 조금 줄여서 재생돼요.' },
  { value: -8, name: '-8 LUFS · 아주 크게', note: '최근 K-pop 음반처럼 큰 소리. 리미터가 많이 눌러 타격감이 줄 수 있어요.' },
];

export const OUTPUT_RATE = 44100;
const CEILING_DB = -1; // 트루 피크 한도 (dBTP)
const MAX_PASSES = 8;
const MAX_REDUCTION_DB = 12; // 이보다 많이 누르면 목표 음량을 포기하고 알린다

function maxReductionDb(curve) {
  let m = 1;
  for (let i = 0; i < curve.length; i++) if (curve[i] < m) m = curve[i];
  return -toDb(m);
}

const tick = () => new Promise((r) => setTimeout(r, 0));

export async function decodeFile(file) {
  const ctx = new OfflineAudioContext(2, 1, OUTPUT_RATE);
  return ctx.decodeAudioData(await file.arrayBuffer());
}

function channelsOf(buffer) {
  const ch = [buffer.getChannelData(0)];
  ch.push(buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : buffer.getChannelData(0));
  return ch;
}

// EQ·컴프레서를 거치고 44.1kHz 스테레오로 다시 샘플링
async function tonal(buffer, preset) {
  const len = Math.ceil(buffer.duration * OUTPUT_RATE);
  const off = new OfflineAudioContext(2, len, OUTPUT_RATE);
  const src = off.createBufferSource();
  src.buffer = buffer;
  const f = (type, freq, gain, q = 0.7) => {
    const b = off.createBiquadFilter();
    b.type = type; b.frequency.value = freq; b.gain.value = gain; b.Q.value = q;
    return b;
  };
  const comp = off.createDynamicsCompressor();
  comp.threshold.value = preset.comp.threshold;
  comp.ratio.value = preset.comp.ratio;
  comp.knee.value = 8;
  comp.attack.value = 0.03;
  comp.release.value = 0.25;
  src.connect(f('highpass', 25, 0))
    .connect(f('lowshelf', 110, preset.low))
    .connect(f('peaking', 350, preset.mud, 1))
    .connect(f('peaking', 3200, preset.presence, 0.8))
    .connect(f('highshelf', 10000, preset.air))
    .connect(comp)
    .connect(off.destination);
  src.start(0);
  return off.startRendering();
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

export function measure(channels, rate) {
  return { lufs: integratedLoudness(channels, rate), peak: toDb(maxOf(truePeakEnvelope(channels))) };
}

// 반환: { channels: [L, R], rate, before, after, maxReduction(dB) }
export async function master(buffer, { preset = 'kpop', target = -14 } = {}, onStep = () => {}) {
  const p = MASTER_PRESETS[preset] || MASTER_PRESETS.natural;
  onStep('원본 음량 재는 중');
  await tick();
  const srcCh = channelsOf(buffer);
  const before = measure(srcCh, buffer.sampleRate);
  onStep('톤 보정·컴프레서');
  await tick();
  const toned = channelsOf(await tonal(buffer, p));
  onStep('피크 분석 중');
  await tick();
  const tpPre = truePeakEnvelope(toned);
  const ceiling = fromDb(CEILING_DB);
  let gainDb = target - integratedLoudness(toned, OUTPUT_RATE);
  let out;
  let curve;
  let reached = false;
  // 리미터가 음량을 깎으므로 여러 번 다시 맞춘다. 리미터가 12dB 넘게 눌러야 하면 소리가 뭉개지므로 거기서 멈춘다.
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    onStep(`음량 맞추는 중 (${pass + 1})`);
    await tick();
    curve = limiterGain(tpPre, fromDb(gainDb), ceiling, OUTPUT_RATE);
    out = applyGain(toned, fromDb(gainDb), curve);
    const l = integratedLoudness(out, OUTPUT_RATE);
    if (!Number.isFinite(l) || Math.abs(l - target) < 0.2) { reached = Number.isFinite(l); break; }
    if (l < target && maxReductionDb(curve) >= MAX_REDUCTION_DB) break;
    gainDb += target - l;
  }
  onStep('최종 확인');
  await tick();
  let peak = maxOf(truePeakEnvelope(out));
  if (peak > ceiling) {
    const trim = ceiling / peak;
    out.forEach((c) => { for (let i = 0; i < c.length; i++) c[i] *= trim; });
    peak = ceiling;
  }
  const after = { lufs: integratedLoudness(out, OUTPUT_RATE), peak: toDb(peak) };
  if (Math.abs(after.lufs - target) < 0.5) reached = true;
  return { channels: out, rate: OUTPUT_RATE, before, after, maxReduction: maxReductionDb(curve), gainDb, reached };
}

export function masterWarnings(res, target) {
  const w = [];
  if (res.reached === false) w.push(`목표 ${target} LUFS까지 올리려면 소리가 뭉개져서 ${res.after.lufs.toFixed(1)} LUFS에서 멈췄어요. 원곡이 이미 압축된 Suno 결과물은 대부분 목표까지 올라가요.`);
  if (res.reached !== false && res.maxReduction > 6) w.push(`리미터가 최대 ${res.maxReduction.toFixed(1)}dB까지 눌렀어요. 소리가 답답하면 목표 음량을 낮춰 보세요.`);
  if (res.before.lufs > target + 2) w.push('원본이 이미 목표보다 커서 음량을 줄였어요. Suno 결과물은 이미 크게 나오는 경우가 많아요.');
  if (res.before.peak > 0) w.push(`원본에 클리핑(피크 ${res.before.peak.toFixed(1)} dBTP)이 있었어요. 가능하면 Suno에서 WAV로 받아 다시 해 보세요.`);
  if (!Number.isFinite(res.before.lufs)) w.push('원본이 거의 무음이에요. 파일을 확인해 주세요.');
  return w;
}
