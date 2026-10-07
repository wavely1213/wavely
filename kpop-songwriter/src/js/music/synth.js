// 소리 엔진: 실제 악기 샘플(samples.js)이 있으면 샘플러로, 없으면 Web Audio 신스로 소리를 만든다.
// 실시간 재생(AudioContext)과 WAV 렌더(OfflineAudioContext)가 같은 코드를 쓴다.
import { sampleKey, nearestNote } from './samples.js';

const noiseCache = new WeakMap();
function noise(ctx) {
  if (noiseCache.has(ctx)) return noiseCache.get(ctx);
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseCache.set(ctx, buf);
  return buf;
}

const hz = (m) => 440 * 2 ** ((m - 69) / 12);

function env(ctx, out, t, { a = 0.005, peak = 1, d = 0.2, s = 0, r = 0.1, hold = 0 }) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  if (hold > 0) {
    g.gain.setTargetAtTime(Math.max(0.0001, peak * s), t + a, d / 3);
    g.gain.setValueAtTime(Math.max(0.0001, peak * s), t + a + Math.max(hold - a, 0.001));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(hold, a) + r);
  } else {
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  g.connect(out);
  return g;
}

function osc(ctx, type, freq, t, stop, detune = 0) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detune;
  o.start(t);
  o.stop(stop);
  return o;
}

function filter(ctx, type, freq, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function noiseSrc(ctx, t, dur) {
  const s = ctx.createBufferSource();
  s.buffer = noise(ctx);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur);
  return s;
}

// ---------- 드럼 ----------
function drum(ctx, out, kind, t, vel, variant, tone, fx) {
  const v = vel;
  if (kind === 'kick') {
    const end = variant === 'boom' ? 0.6 : 0.35;
    const o = osc(ctx, 'sine', variant === 'electro' ? 180 : 150, t, t + end + 0.05);
    o.frequency.exponentialRampToValueAtTime(variant === 'boom' ? 40 : 48, t + 0.12);
    o.connect(env(ctx, out, t, { peak: v * 1.1, d: end }));
    const click = noiseSrc(ctx, t, 0.02);
    click.connect(env(ctx, fx('click', () => filter(ctx, 'highpass', 2000)), t, { peak: v * 0.25 * (0.5 + tone), d: 0.015 }));
  } else if (kind === 'snare' || kind === 'clap') {
    const f = kind === 'clap'
      ? fx('clap', () => filter(ctx, 'bandpass', 1200 + tone * 1200, 1.2))
      : fx('snare', () => filter(ctx, 'highpass', 900 + tone * 1500));
    if (kind === 'clap') {
      [0, 0.012, 0.024].forEach((dt) => noiseSrc(ctx, t + dt, dt === 0.024 ? 0.22 : 0.03).connect(env(ctx, f, t + dt, { peak: v * 0.6, d: dt === 0.024 ? 0.18 : 0.01 })));
    } else {
      noiseSrc(ctx, t, 0.3).connect(env(ctx, f, t, { peak: v * 0.7, d: variant === 'boom' ? 0.25 : 0.16 }));
      osc(ctx, 'triangle', 190, t, t + 0.12).connect(env(ctx, out, t, { peak: v * 0.5, d: 0.1 }));
    }
  } else if (kind === 'hat' || kind === 'ohat') {
    const n = noiseSrc(ctx, t, kind === 'ohat' ? 0.35 : 0.06);
    n.connect(env(ctx, fx('hat', () => filter(ctx, 'highpass', 6000 + tone * 3000)), t, { peak: v * 0.28, d: kind === 'ohat' ? 0.3 : 0.045 }));
  } else if (kind === 'crash') {
    noiseSrc(ctx, t, 1.6).connect(env(ctx, fx('crash', () => filter(ctx, 'highpass', 4500)), t, { peak: v * 0.3, d: 1.5 }));
  }
}

// ---------- 음정 악기 ----------
function voice(ctx, out, inst, variant, tone, note, t, dur, vel, strum = 0, fx) {
  const f = hz(note);
  const st = t + strum * 0.012;
  const bright = 0.3 + tone * 1.4; // 밝기 배율
  switch (inst) {
    case 'bass': {
      const type = variant === 'round' ? 'triangle' : 'sawtooth';
      const lp = fx('lp', () => filter(ctx, 'lowpass', (variant === 'growl' ? 900 : 500) * bright, variant === 'growl' ? 6 : 1));
      osc(ctx, type, f, st, st + dur + 0.1).connect(env(ctx, lp, st, { peak: vel * 0.55, d: 0.1, s: 0.7, hold: dur, r: 0.06 }));
      osc(ctx, 'sine', f / 2, st, st + dur + 0.1).connect(env(ctx, out, st, { peak: vel * 0.55, d: 0.1, s: 0.7, hold: dur, r: 0.06 }));
      break;
    }
    case 'b808': {
      const o = osc(ctx, 'sine', f * 1.5, st, st + dur + 0.4);
      o.frequency.exponentialRampToValueAtTime(f, st + 0.05);
      let node = o;
      if (variant === 'dirty') {
        const ws = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = (i / 128) - 1; curve[i] = Math.tanh(x * (2 + tone * 4)); }
        ws.curve = curve;
        node = o.connect(ws);
      }
      node.connect(env(ctx, out, st, { peak: vel * 0.8, d: 0.2, s: 0.8, hold: dur, r: 0.25 }));
      break;
    }
    case 'pad':
    case 'strings': {
      const lp = fx('lp', () => filter(ctx, 'lowpass', (inst === 'pad' ? (variant === 'dark' ? 700 : 1600) : 2400) * bright));
      const g = env(ctx, lp, st, { a: inst === 'pad' ? 0.35 : 0.18, peak: vel * 0.13, d: 0.3, s: 0.9, hold: dur, r: 0.5 });
      const types = variant === 'airy' ? ['triangle', 'sine'] : ['sawtooth', 'sawtooth'];
      [-9, 9].forEach((dt, i) => osc(ctx, types[i], f, st, st + dur + 0.6, dt).connect(g));
      if (variant === 'airy') noiseSrc(ctx, st, dur + 0.5).connect(filter(ctx, 'bandpass', f * 4, 4)).connect(env(ctx, out, st, { a: 0.4, peak: vel * 0.03, d: 0.2, s: 1, hold: dur, r: 0.5 }));
      break;
    }
    case 'piano': {
      const lp = fx('lp', () => filter(ctx, 'lowpass', (variant === 'lofi' ? 1400 : 4000) * bright));
      const decay = Math.min(variant === 'electric' ? 1.2 : 1.6, dur * 1.5 + 0.2);
      const g = env(ctx, lp, st, { a: 0.003, peak: vel * 0.22, d: decay });
      const end = st + decay + 0.05;
      osc(ctx, variant === 'electric' ? 'sine' : 'triangle', f, st, end).connect(g);
      osc(ctx, 'sine', f * 2, st, st + 0.45).connect(env(ctx, g, st, { peak: 0.4, d: 0.4 }));
      if (variant === 'electric') osc(ctx, 'sine', f * 4, st, st + 0.2).connect(env(ctx, g, st, { peak: 0.25, d: 0.15 }));
      break;
    }
    case 'guitar': {
      const lp = fx('lp', () => { const a = filter(ctx, 'highpass', 120); a.connect(filter(ctx, 'lowpass', (variant === 'acoustic' ? 3500 : 2500) * bright)).connect(out); return a; }, true);
      const d = Math.min(1.4, dur + 0.3);
      osc(ctx, variant === 'acoustic' ? 'sawtooth' : 'square', f, st, st + d + 0.05).connect(env(ctx, lp, st, { a: 0.002, peak: vel * 0.16, d }));
      break;
    }
    case 'pluck':
    case 'arp': {
      const lp = filter(ctx, 'lowpass', 400, 4);
      const top = (variant === 'soft' ? 1800 : 4500) * bright;
      lp.frequency.setValueAtTime(top, st);
      lp.frequency.exponentialRampToValueAtTime(300, st + 0.25);
      lp.connect(env(ctx, out, st, { a: 0.002, peak: vel * 0.2, d: inst === 'arp' ? 0.22 : 0.3 }));
      osc(ctx, variant === 'glassy' ? 'triangle' : 'sawtooth', f, st, st + 0.4).connect(lp);
      if (variant === 'glassy') osc(ctx, 'sine', f * 3, st, st + 0.3).connect(env(ctx, out, st, { peak: vel * 0.06, d: 0.2 }));
      break;
    }
    case 'lead': {
      // 가이드 멜로디: 보컬은 포먼트 필터로 "아-" 소리를 흉내 낸다
      const g = env(ctx, out, st, { a: 0.02, peak: vel * 0.22, d: 0.1, s: 0.85, hold: dur, r: 0.08 });
      if (variant === 'voice') {
        const mix = ctx.createGain();
        mix.gain.value = 0.5;
        [[800, 6], [1150, 8], [2900, 10]].forEach(([fr, q]) => mix.connect(filter(ctx, 'bandpass', fr * (0.8 + tone * 0.4), q)).connect(g));
        const o = osc(ctx, 'sawtooth', f, st, st + dur + 0.2);
        const lfo = osc(ctx, 'sine', 5.5, st, st + dur + 0.2);
        const depth = ctx.createGain();
        depth.gain.value = 6;
        lfo.connect(depth).connect(o.detune);
        o.connect(mix);
        osc(ctx, 'sine', f, st, st + dur + 0.2).connect(g);
      } else if (variant === 'flute') {
        osc(ctx, 'sine', f, st, st + dur + 0.2).connect(g);
        noiseSrc(ctx, st, dur + 0.1).connect(filter(ctx, 'bandpass', f * 2, 6)).connect(env(ctx, out, st, { a: 0.03, peak: vel * 0.04, d: 0.1, s: 0.8, hold: dur, r: 0.05 }));
      } else {
        const lp = filter(ctx, 'lowpass', 2500 * bright);
        lp.connect(g);
        osc(ctx, 'square', f, st, st + dur + 0.15).connect(lp);
      }
      break;
    }
    default:
  }
}

// ---------- 샘플러 ----------
// 악기별 레벨 맞춤(샘플마다 녹음 음량이 달라서)과 엔벨로프
const SAMPLER = {
  drums: { trim: 0.9 },
  bass: { trim: 1.0, attack: 0.004, release: 0.08 },
  piano: { trim: 0.75, attack: 0.002, release: 0.3 },
  pad: { trim: 0.42, attack: 0.25, release: 0.6 },
  strings: { trim: 0.45, attack: 0.15, release: 0.5 },
  guitar: { trim: 0.6, attack: 0.002, release: 0.25 },
  lead: { trim: 0.8, attack: 0.03, release: 0.12 },
};

function playSample(ctx, out, buffer, rate, t, dur, gain, a, r) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + a);
  src.connect(g).connect(out);
  src.start(t);
  const natural = buffer.duration / rate;
  if (dur != null && dur + r < natural) {
    g.gain.setValueAtTime(gain, t + Math.max(a, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a, dur) + r);
    src.stop(t + Math.max(a, dur) + r + 0.02);
  }
}

function sampled(ctx, out, pack, inst, variant, e, t, dur, fx) {
  const cfg = SAMPLER[inst] || { trim: 0.7, attack: 0.01, release: 0.2 };
  const gain = cfg.trim * e.vel ** 1.4;
  if (pack.hits) {
    const buf = pack.hits[e.note] || (e.note === 'clap' ? pack.hits.snare : null) || (e.note === 'crash' ? pack.hits.ohat : null);
    if (buf) playSample(ctx, out, buf, 1, t, null, gain * (e.note === 'hat' || e.note === 'ohat' ? 0.6 : 1), 0.001, 0);
    return;
  }
  let dest = out;
  if (inst === 'piano' && variant === 'lofi') dest = fx('lofi', () => filter(ctx, 'lowpass', 1800));
  const { buffer, rate } = nearestNote(pack, e.note);
  const st = t + (e.strum || 0) * 0.015;
  playSample(ctx, dest, buffer, variant === 'lofi' ? rate * 0.997 : rate, st, dur, gain, cfg.attack, cfg.release);
}

// 악기별 볼륨 노드를 만들고 이벤트를 소리로 바꾸는 함수를 돌려준다
// bank: samples.loadBank 결과 (없으면 전부 신스)
export function createMixer(ctx, destination, sounds, bank = {}) {
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(comp).connect(destination);
  const buses = {};
  // 악기 버스: 볼륨 → 밝기(하이셸프) → 마스터
  Object.entries(sounds).forEach(([id, s]) => {
    const g = ctx.createGain();
    g.gain.value = s.mute ? 0 : s.vol;
    const shelf = filter(ctx, 'highshelf', 5000);
    shelf.gain.value = (s.tone - 0.5) * 14;
    g.connect(shelf).connect(master);
    buses[id] = g;
  });
  // 악기마다 필터를 하나씩만 만들어 공유 (음표마다 만들면 렌더가 매우 느려짐)
  const shared = {};
  const fxFor = (id) => (key, make, selfConnected = false) => {
    const k = `${id}:${key}`;
    if (!shared[k]) {
      shared[k] = make();
      if (!selfConnected) shared[k].connect(buses[id]);
    }
    return shared[k];
  };
  return {
    master,
    play(e, t, stepSec) {
      const s = sounds[e.inst];
      if (!s || s.mute) return;
      const out = buses[e.inst];
      const pack = bank[sampleKey(e.inst, s.variant)];
      if (pack) { sampled(ctx, out, pack, e.inst, s.variant, e, t, e.len * stepSec, fxFor(e.inst)); return; }
      if (e.inst === 'drums') drum(ctx, out, e.note, t, e.vel, s.variant, s.tone, fxFor(e.inst));
      else voice(ctx, out, e.inst, s.variant, s.tone, e.note, t, e.len * stepSec, e.vel, e.strum || 0, fxFor(e.inst));
    },
    setVolume(id, vol, mute) {
      if (buses[id]) buses[id].gain.setTargetAtTime(mute ? 0 : vol, ctx.currentTime, 0.02);
    },
  };
}
