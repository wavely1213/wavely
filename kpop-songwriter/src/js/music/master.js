// 마스터링: 톤 보정(EQ) → 글루 컴프레서 → 목표 음량(LUFS)으로 맞춤 → 트루 피크 리미터 → 44.1kHz.
import { processMaster, measure, OUTPUT_RATE } from './dsp.js';
import { CLIP_WARN } from './qc.js';

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

export { OUTPUT_RATE, finishEdges, measure } from './dsp.js';

// 워커 소스: 웹·아티팩트 빌드에서 build.mjs가 넣는다. 없으면(테스트 번들 등) 화면 스레드에서 계산.
const WORKER_SRC = typeof __DSP_WORKER__ !== 'undefined' ? __DSP_WORKER__ : null;
let worker = null;
let seq = 0;
const waiting = new Map();

function getWorker() {
  if (!WORKER_SRC || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
      worker.onmessage = (e) => {
        const w = waiting.get(e.data.id);
        if (!w) return;
        if (e.data.step) { w.onStep(e.data.step); return; }
        waiting.delete(e.data.id);
        if (e.data.error) w.reject(new Error(e.data.error)); else w.resolve(e.data.result);
      };
      worker.onerror = () => { waiting.forEach((w) => w.reject(new Error('worker'))); waiting.clear(); worker = null; };
    } catch {
      worker = null;
    }
  }
  return worker;
}

function inWorker(kind, payload, onStep = () => {}) {
  const w = getWorker();
  if (!w) return null;
  const id = ++seq;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject, onStep });
    w.postMessage({ id, kind, payload });
  });
}

export async function measureAsync(channels, rate) {
  const job = inWorker('measure', { channels, rate });
  if (job) { try { return await job; } catch { /* 워커 실패 → 아래에서 직접 계산 */ } }
  return measure(channels, rate);
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







// 반환: { channels: [L, R], rate, before, after, maxReduction(dB), reached, trimmedStart, trimmedEnd, cutAt(초, 0 = 안 자름) }
// preset 'ref'면 eq(레퍼런스 맞춤 설정, music/tonematch.js)를 쓴다
export function presetOf({ preset, eq }) {
  return preset === 'ref' && eq ? eq : MASTER_PRESETS[preset] || MASTER_PRESETS.natural;
}

// 곡 끝 자르기: endAt(초) 뒤를 버린 새 버퍼. 자를 게 없으면(0·원본보다 김) null.
export function cutBuffer(buffer, endAt) {
  const len = Math.round(endAt * buffer.sampleRate);
  if (!(endAt > 0) || len >= buffer.length) return null;
  const out = new AudioBuffer({ numberOfChannels: buffer.numberOfChannels, length: len, sampleRate: buffer.sampleRate });
  for (let c = 0; c < buffer.numberOfChannels; c++) out.copyToChannel(buffer.getChannelData(c).subarray(0, len), c);
  return out;
}

// endAt: 곡 끝 시각(초, 0 = 끝까지). Suno가 끝을 늘이거나 이상하게 끝낼 때 잘라 낸다.
export async function master(buffer, { preset = 'kpop', eq = null, target = -14, trim = true, fadeOut = 0, endAt = 0 } = {}, onStep = () => {}) {
  const p = presetOf({ preset, eq });
  const cut = cutBuffer(buffer, endAt);
  if (cut) buffer = cut;
  const cutAt = cut ? endAt : 0;
  onStep('톤 보정·컴프레서');
  await tick();
  const toned = channelsOf(await tonal(buffer, p));
  const payload = { src: channelsOf(buffer), srcRate: buffer.sampleRate, toned, target, trim, fadeOut, cut: !!cut };
  const viaWorker = inWorker('master', payload, onStep);
  if (viaWorker) {
    try { return { ...(await viaWorker), via: 'worker', cutAt }; } catch { onStep('다시 계산 중'); /* 워커가 도중에 실패(메모리 등) → 화면 스레드로 */ }
  }
  await tick();
  return { ...processMaster(payload, onStep), via: 'main', cutAt };
}

export function masterWarnings(res, target) {
  const w = [];
  if (res.reached === false) w.push(`목표 ${target} LUFS까지 올리려면 소리가 뭉개져서 ${res.after.lufs.toFixed(1)} LUFS에서 멈췄어요. 원곡이 이미 압축된 Suno 결과물은 대부분 목표까지 올라가요.`);
  if (res.reached !== false && res.maxReduction > 6) w.push(`리미터가 최대 ${res.maxReduction.toFixed(1)}dB까지 눌렀어요. 소리가 답답하면 목표 음량을 낮춰 보세요.`);
  if (res.before.lufs > target + 2) w.push('원본이 이미 목표보다 커서 음량을 줄였어요. Suno 결과물은 이미 크게 나오는 경우가 많아요.');
  if (res.qc) {
    if (res.qc.clips >= CLIP_WARN) w.push(`원본 파형이 ${res.qc.clips}곳에서 잘려 있어요(하드 클리핑). 마스터링으로는 되살릴 수 없어요 — 가능하면 Suno에서 WAV로 다시 받아 오세요.`);
    if (res.qc.corr < 0) w.push(`좌우 소리의 위상이 반대인 부분이 많아요 (스테레오 상관 ${res.qc.corr.toFixed(2)}). 모노 스피커(폰·블루투스 스피커 하나)에서 소리가 작아지거나 빠질 수 있어요. 다른 테이크를 써 보세요.`);
  } else if (res.before.peak > 0) w.push(`원본에 클리핑(피크 ${res.before.peak.toFixed(1)} dBTP)이 있었어요. 가능하면 Suno에서 WAV로 받아 다시 해 보세요.`);
  if (!Number.isFinite(res.before.lufs)) w.push('원본이 거의 무음이에요. 파일을 확인해 주세요.');
  return w;
}
