// 재생기: 이벤트를 조금씩 앞당겨 예약하는 방식(룩어헤드)으로 실시간 재생. WAV 렌더도 여기서.
import { buildTimeline, stepSeconds } from './timeline.js';
import { createMixer } from './synth.js';
import { loadBank } from './samples.js';

let ctx = null;
let session = null;
const listeners = new Set();

export function onPlayer(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach((fn) => fn(state())); }

export function state() {
  if (!session) return { playing: false, loading: loading > 0, step: 0, label: '' };
  const step = Math.max(0, (ctx.currentTime - session.t0) / session.stepSec);
  return { playing: true, step, label: session.label, marks: session.marks, totalSteps: session.totalSteps };
}

export function isPlaying() { return !!session; }

let loading = 0;
let token = 0; // 불러오는 사이 정지·다른 재생을 누르면 이전 요청은 버린다
export function isLoading() { return loading > 0; }

// 샘플을 불러온 뒤 재생 시작. 불러오는 동안 isLoading() = true
export async function play(song, { onlyIds, label = '' } = {}) {
  stop();
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  const my = ++token;
  loading += 1;
  emit();
  let bank;
  try { bank = await loadBank(song); } finally { loading -= 1; }
  if (my !== token) { emit(); return false; }
  return start(song, bank, { onlyIds, label });
}

function start(song, bank, { onlyIds, label }) {
  const tl = buildTimeline(song, onlyIds);
  if (!tl.events.length) return false;
  const stepSec = stepSeconds(tl.bpm);
  const mixer = createMixer(ctx, ctx.destination, song.music.sounds, bank);
  const t0 = ctx.currentTime + 0.1;
  let i = 0;
  const s = { t0, stepSec, mixer, label, marks: tl.marks, totalSteps: tl.totalSteps, timer: null, raf: null };
  const tick = () => {
    const horizon = ctx.currentTime + 0.25;
    while (i < tl.events.length) {
      const e = tl.events[i];
      const t = t0 + e.step * stepSec;
      if (t > horizon) break;
      if (t >= ctx.currentTime - 0.02) mixer.play(e, t, stepSec);
      i += 1;
    }
    if (ctx.currentTime > t0 + tl.totalSteps * stepSec + 1.5) stop();
  };
  s.timer = setInterval(tick, 50);
  tick();
  const frame = () => { if (session === s) { emit(); s.raf = requestAnimationFrame(frame); } };
  session = s;
  s.raf = requestAnimationFrame(frame);
  emit();
  return true;
}

export function stop() {
  token += 1;
  if (!session) { emit(); return; }
  const s = session;
  session = null;
  clearInterval(s.timer);
  cancelAnimationFrame(s.raf);
  try {
    s.mixer.master.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
    setTimeout(() => s.mixer.master.disconnect(), 200);
  } catch { /* 이미 끊김 */ }
  emit();
}

// 재생 중 음량·음소거 바로 반영
export function liveVolume(id, vol, mute) { session?.mixer.setVolume(id, vol, mute); }

// 미리듣기: 한 음 또는 드럼 한 번
export async function audition(song, inst) {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  const bank = await loadBank(song, [inst]);
  const mixer = createMixer(ctx, ctx.destination, { [inst]: { ...song.music.sounds[inst], mute: false } }, bank);
  const t = ctx.currentTime + 0.05;
  const sec = stepSeconds(song.music.bpm);
  if (inst === 'drums') ['kick', 'hat', 'snare', 'hat'].forEach((k, i) => mixer.play({ inst, note: k, vel: 0.9, len: 1 }, t + i * sec * 4, sec));
  else [0, 4, 7].forEach((iv, i) => mixer.play({ inst, note: (['bass', 'b808'].includes(inst) ? 36 : 60) + song.music.root + iv, vel: 0.9, len: 6 }, t + i * sec * 4, sec));
  setTimeout(() => mixer.master.disconnect(), 4000);
}

// 곡 전체를 스테레오 오디오 버퍼로 렌더 (WAV 데모용).
// 음표를 한꺼번에 예약하면 노드가 너무 많아 느려지므로, 2초씩 멈춰 가며 그때그때 예약한다.
export async function renderSong(song, sampleRate = 44100, onProgress = () => {}) {
  const tl = buildTimeline(song);
  const stepSec = stepSeconds(tl.bpm);
  const seconds = tl.totalSteps * stepSec + 2;
  const off = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const bank = await loadBank(song);
  const mixer = createMixer(off, off.destination, song.music.sounds, bank);
  const CHUNK = 2;
  let i = 0;
  const scheduleUntil = (until) => {
    while (i < tl.events.length) {
      const e = tl.events[i];
      const t = 0.05 + e.step * stepSec;
      if (t >= until) break;
      mixer.play(e, t, stepSec);
      i += 1;
    }
  };
  scheduleUntil(CHUNK);
  for (let t = CHUNK / 2; t < seconds - CHUNK / 2; t += CHUNK) {
    const at = t;
    off.suspend(at).then(() => {
      scheduleUntil(at + CHUNK * 1.5);
      onProgress(at / seconds);
      off.resume();
    });
  }
  return off.startRendering();
}
