// 마스터링: 톤 보정(EQ) → 글루 컴프레서 → 목표 음량(LUFS)으로 맞춤 → 트루 피크 리미터 → 44.1kHz.
import { processMaster, measure, OUTPUT_RATE, DEFAULT_TARGET, LIMITER_WARN_DB } from './dsp.js';
import { CLIP_WARN } from './qc.js';

export const MASTER_PRESETS = {
  natural: { name: '자연스럽게', low: 0, mud: 0, presence: 0.5, air: 1, comp: { threshold: -20, ratio: 1.6 } },
  kpop: { name: '밝고 선명하게 (K-pop)', low: 1.5, mud: -1.5, presence: 2, air: 3, comp: { threshold: -22, ratio: 2.2 } },
  bass: { name: '저음 강하게', low: 3.5, mud: -1, presence: 0.5, air: 1.5, comp: { threshold: -22, ratio: 2 } },
  vocal: { name: '보컬 또렷하게', low: 0, mud: -2, presence: 3, air: 2, comp: { threshold: -20, ratio: 1.8 } },
};

// 거친 고음 부드럽게: Suno 결과에 흔한 쇳소리·치찰음 대역(6~7kHz)을 살짝 내린다
export const SOFTEN = { freq: 6500, gain: -2.5, q: 1.4 };

// 목표 음량 선택지. 국내 플랫폼·유통사의 공개 규격이 없어 '국내 기준'이라고 쓰지 않는다 (유통사가 권장치를 주면 그걸 따름)
// 기본값 칸은 DEFAULT_TARGET에서 만든다 (값을 바꾸면 칸·표시가 같이 바뀜)
const OTHER_TARGETS = [
  { value: -11, name: '-11 LUFS · 조금 작게', note: '다이내믹을 조금 더 남겨요. 발라드·어쿠스틱에 어울려요.' },
  { value: -14, name: '-14 LUFS · 스트리밍 맞춤 기준', note: '음량을 맞춰 트는 곳에선 손해가 없지만, 맞추지 않는 재생(벅스 기본 설정 등)에선 다른 곡보다 작게 들려요.' },
  { value: -8, name: '-8 LUFS · 아주 크게', note: '리미터가 많이 눌러 타격감이 줄 수 있어요.' },
];
export const LOUDNESS_TARGETS = [
  { value: DEFAULT_TARGET, name: `${DEFAULT_TARGET} LUFS · 크게 (기본)`, note: '큰 상업 음원에 가까운 크기예요. 음량을 맞춰 트는 곳(유튜브 뮤직·스포티파이·멜론 음량최적화)에선 줄여서 재생돼요.' },
  ...OTHER_TARGETS.filter((t) => t.value !== DEFAULT_TARGET),
];

export { OUTPUT_RATE, DEFAULT_TARGET, finishEdges, measure } from './dsp.js';

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
async function tonal(buffer, preset, soften = false) {
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
    .connect(f('peaking', SOFTEN.freq, soften ? SOFTEN.gain : 0, SOFTEN.q))
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
export async function master(buffer, { preset = 'kpop', eq = null, target = DEFAULT_TARGET, trim = true, fadeOut = 0, endAt = 0, soften = false } = {}, onStep = () => {}) {
  const p = presetOf({ preset, eq });
  const original = buffer; // '원본' 측정값은 자르기 전 전체 기준 (결과 표의 원본 길이·같은 음량 비교와 맞춤)
  const cut = cutBuffer(buffer, endAt);
  if (cut) buffer = cut;
  const cutAt = cut ? endAt : 0;
  onStep('톤 보정·컴프레서');
  await tick();
  const toned = channelsOf(await tonal(buffer, p, soften));
  const payload = { src: channelsOf(original), srcRate: original.sampleRate, toned, target, trim, fadeOut, cut: !!cut };
  const viaWorker = inWorker('master', payload, onStep);
  if (viaWorker) {
    try { return { ...(await viaWorker), via: 'worker', cutAt }; } catch { onStep('다시 계산 중'); /* 워커가 도중에 실패(메모리 등) → 화면 스레드로 */ }
  }
  await tick();
  return { ...processMaster(payload, onStep), via: 'main', cutAt };
}

// 리미터 경고: 화면에 보이는 0.1dB 값이 문턱(LIMITER_WARN_DB)을 넘을 때. 처방은 지금보다 한 칸 작은 목표를 숫자로 짚는다
// (칸 순서가 -9·-11·-14·-8이라 '한 단계'는 헷갈림. 값으로 고른다). 가장 작은 목표면 음색·테이크를 권한다 (D-029)
function limiterWarning(res, target) {
  const shown = Math.round(res.maxReduction * 10) / 10;
  if (res.reached === false || !(shown > LIMITER_WARN_DB)) return null;
  const head = `리미터가 소리를 많이 눌렀어요(최대 ${shown.toFixed(1)}dB). 드럼 타격감이 줄고 답답하게 들릴 수 있어요.`;
  const lower = LOUDNESS_TARGETS.map((t) => t.value).filter((v) => v < target).sort((a, b) => b - a)[0];
  if (lower !== undefined) {
    const label = lower === DEFAULT_TARGET ? `기본값인 ${lower} LUFS` : `${lower} LUFS`;
    return `${head} 목표 음량을 ${label}로 낮춰 다시 마스터링해 보세요. 음량을 맞춰 트는 곳(유튜브 뮤직·스포티파이·멜론 음량최적화)에선 낮춰도 같은 크기로 들려요.`;
  }
  return res.settings?.preset === 'natural'
    ? `${head} 목표 음량은 더 낮출 수 없으니 다른 테이크를 써 보세요.`
    : `${head} 목표 음량은 더 낮출 수 없으니 음색을 '${MASTER_PRESETS.natural.name}'로 바꾸거나 다른 테이크를 써 보세요.`;
}

export function masterWarnings(res, target) {
  const w = [];
  if (res.reached === false) w.push(`목표 ${target} LUFS까지 올리려면 소리가 뭉개져서 ${res.after.lufs.toFixed(1)} LUFS에서 멈췄어요. 원곡이 이미 압축된 Suno 결과물은 대부분 목표까지 올라가요.`);
  const lim = limiterWarning(res, target);
  if (lim) w.push(lim);
  if (res.before.lufs > target + 2) w.push('원본이 이미 목표보다 커서 음량을 줄였어요. Suno 결과물은 이미 크게 나오는 경우가 많아요.');
  if (res.qc) {
    if (res.qc.clips >= CLIP_WARN) w.push(`원본 파형이 ${res.qc.clips}곳에서 잘려 있어요(하드 클리핑). 마스터링으로는 되살릴 수 없어요 — 가능하면 Suno에서 WAV로 다시 받아 오세요.`);
    if (res.qc.corr < 0) w.push(`좌우 소리의 위상이 반대인 부분이 많아요 (스테레오 상관 ${res.qc.corr.toFixed(2)}). 모노 스피커(폰·블루투스 스피커 하나)에서 소리가 작아지거나 빠질 수 있어요. 다른 테이크를 써 보세요.`);
  } else if (res.before.peak > 0) w.push(`원본에 클리핑(피크 ${res.before.peak.toFixed(1)} dBTP)이 있었어요. 가능하면 Suno에서 WAV로 받아 다시 해 보세요.`);
  if (!Number.isFinite(res.before.lufs)) w.push('원본이 거의 무음이에요. 파일을 확인해 주세요.');
  return w;
}
