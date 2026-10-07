// 표준 MIDI 파일(Type 1) 만들기. 악기마다 트랙 하나, 드럼은 10번 채널.
import { buildTimeline } from './timeline.js';
import { INSTRUMENT_BY_ID } from './instruments.js';
import { keyName } from './theory.js';

const PPQ = 480;
const STEP_TICKS = PPQ / 4;
const DRUM_NOTE = { kick: 36, snare: 38, clap: 39, hat: 42, ohat: 46, crash: 49 };

function vlq(n) {
  const bytes = [n & 0x7f];
  let v = n >> 7;
  while (v > 0) { bytes.unshift((v & 0x7f) | 0x80); v >>= 7; }
  return bytes;
}
const str = (s) => [...new TextEncoder().encode(s)];
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const u16 = (n) => [(n >> 8) & 255, n & 255];

function track(events) {
  // events: [{tick, bytes}] → 델타 타임 + 끝 표시
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const data = [];
  let last = 0;
  events.forEach((e) => { data.push(...vlq(e.tick - last), ...e.bytes); last = e.tick; });
  data.push(0, 0xff, 0x2f, 0);
  return [...str('MTrk'), ...u32(data.length), ...data];
}

function meta(tick, type, bytes) { return { tick, order: 0, bytes: [0xff, type, ...vlq(bytes.length), ...bytes] }; }

export function buildMidi(song) {
  const tl = buildTimeline(song);
  const tempo = Math.round(60000000 / tl.bpm);
  const conductor = [
    meta(0, 0x03, str(song.title || 'Untitled')),
    meta(0, 0x51, [(tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255]),
    meta(0, 0x58, [4, 2, 24, 8]),
    meta(0, 0x01, str(`Key: ${keyName(song.music.root, song.music.mode)}`)),
  ];
  const labels = song.sections.map((s) => s.type);
  tl.marks.forEach((m, i) => conductor.push(meta(m.step * STEP_TICKS, 0x06, str(labels[i] || 'Section'))));

  const byInst = {};
  tl.events.forEach((e) => { (byInst[e.inst] = byInst[e.inst] || []).push(e); });
  const tracks = [track(conductor)];
  let ch = 0;
  Object.entries(byInst).forEach(([inst, evs]) => {
    const info = INSTRUMENT_BY_ID[inst];
    const isDrum = inst === 'drums';
    const channel = isDrum ? 9 : ch++;
    if (ch === 9) ch++;
    const list = [meta(0, 0x03, str(info?.name || inst))];
    if (!isDrum && info?.gm != null) list.push({ tick: 0, order: 1, bytes: [0xc0 | channel, info.gm] });
    evs.forEach((e) => {
      const note = isDrum ? DRUM_NOTE[e.note] : e.note;
      if (note == null) return;
      const vel = Math.max(1, Math.min(127, Math.round(e.vel * 110)));
      const on = e.step * STEP_TICKS + (e.strum || 0) * 10;
      const len = isDrum ? STEP_TICKS / 2 : e.len * STEP_TICKS - 10;
      list.push({ tick: on, order: 3, bytes: [0x90 | channel, note, vel] });
      list.push({ tick: on + Math.max(10, len), order: 2, bytes: [0x80 | channel, note, 0] });
      if (inst === 'lead' && e.syl) list.push(meta(on, 0x05, str(e.syl)));
    });
    tracks.push(track(list));
  });
  const header = [...str('MThd'), ...u32(6), ...u16(1), ...u16(tracks.length), ...u16(PPQ)];
  return new Uint8Array([...header, ...tracks.flat()]);
}
