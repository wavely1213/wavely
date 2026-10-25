// 곡 데이터 → 음표 이벤트 목록. 재생·WAV 렌더·MIDI 내보내기가 모두 이 결과를 쓴다.
// 이벤트: { inst, step(곡 시작부터 16분음표 칸), len(칸), note(MIDI 번호 또는 드럼 이름), vel(0~1) }
import { chordNotes, degreeToMidi } from './theory.js';
import { DRUM_PATTERNS, BASS_PATTERNS } from './patterns.js';

function fold(n, lo, hi) {
  let x = n;
  while (x < lo) x += 12;
  while (x > hi) x -= 12;
  return x;
}

function pianoRhythm(energy) {
  if (energy <= 2) return [[0, 8], [8, 8]];
  if (energy === 3) return [[0, 3], [3, 3], [6, 4], [10, 2], [12, 4]];
  return [[0, 2], [2, 2], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2]];
}

function sectionEvents(music, sm, startStep, nextEnergy) {
  const ev = [];
  const { root, mode } = music;
  const vel = Math.min(1, 0.5 + sm.energy * 0.1);
  const has = (id) => sm.instruments.includes(id);
  const grid = sm.drumGrid || DRUM_PATTERNS[sm.drum]?.grid;

  for (let bar = 0; bar < sm.bars; bar++) {
    const s0 = startStep + bar * 16;
    const degree = sm.chords[bar % sm.chords.length] || 1;
    const chord = chordNotes(root, mode, degree, sm.seventh);
    const up = chord.map((n) => n + 12);
    const bassRoot = fold(chord[0] - 12, 28, 45);

    if (has('drums') && grid) {
      const lastBar = bar === sm.bars - 1;
      const fill = lastBar && nextEnergy > sm.energy;
      Object.entries(grid).forEach(([kind, steps]) => {
        steps.forEach((on, i) => {
          if (!on) return;
          if (kind === 'hat' && sm.energy <= 2 && i % 4 !== 0) return;
          if (fill && i >= 12 && kind !== 'kick') return;
          ev.push({ inst: 'drums', step: s0 + i, len: 1, note: kind, vel: vel * (kind === 'hat' && i % 4 ? 0.7 : 1) });
        });
      });
      if (fill) [12, 13, 14, 15].forEach((i, k) => ev.push({ inst: 'drums', step: s0 + i, len: 1, note: 'snare', vel: 0.5 + k * 0.15 }));
      if (bar === 0 && sm.energy >= 4) ev.push({ inst: 'drums', step: s0, len: 1, note: 'crash', vel: 0.8 });
    }

    const bassPat = BASS_PATTERNS[sm.bass] || BASS_PATTERNS.long;
    if (has('bass')) bassPat.notes.forEach(([st, ln, oct]) => ev.push({ inst: 'bass', step: s0 + st, len: ln, note: bassRoot + 12 * oct, vel }));
    if (has('b808')) bassPat.notes.forEach(([st, ln]) => ev.push({ inst: 'b808', step: s0 + st, len: ln, note: fold(bassRoot, 28, 40), vel }));

    if (has('pad')) chord.forEach((n) => ev.push({ inst: 'pad', step: s0, len: 16, note: n + 12, vel: vel * 0.8 }));
    if (has('strings')) chord.forEach((n) => ev.push({ inst: 'strings', step: s0, len: 16, note: n + 12, vel: vel * 0.8 }));
    if (has('piano')) pianoRhythm(sm.energy).forEach(([st, ln]) => up.forEach((n) => ev.push({ inst: 'piano', step: s0 + st, len: ln, note: n, vel: vel * 0.8 })));
    if (has('guitar')) [[0, 8], [8, 8]].forEach(([st, ln]) => up.forEach((n, k) => ev.push({ inst: 'guitar', step: s0 + st, len: ln, note: n, vel: vel * 0.8, strum: k })));
    if (has('pluck')) [2, 6, 10, 14].forEach((st) => up.forEach((n) => ev.push({ inst: 'pluck', step: s0 + st, len: 1, note: n, vel: vel * 0.7 })));
    if (has('arp')) {
      const tones = [...up, up[0] + 12];
      const every = sm.energy <= 2 ? 2 : 1;
      for (let i = 0; i < 16; i += every) ev.push({ inst: 'arp', step: s0 + i, len: every, note: tones[(i / every) % tones.length], vel: vel * 0.55 });
    }
  }

  sm.melody.forEach((n) => {
    if (n.s >= sm.bars * 16) return;
    ev.push({ inst: 'lead', step: startStep + n.s, len: Math.max(1, n.l), note: degreeToMidi(root, mode, n.d, 60), vel: 0.9, syl: n.syl || '' });
  });
  return ev;
}

// onlyIds: 특정 섹션만 (섹션 미리듣기)
export function buildTimeline(song, onlyIds) {
  const music = song.music;
  const events = [];
  const marks = [];
  let step = 0;
  song.sections.forEach((s, i) => {
    if (onlyIds && !onlyIds.includes(s.id)) return;
    const sm = music.sections[s.id];
    if (!sm) return;
    const next = song.sections[i + 1] && music.sections[song.sections[i + 1].id];
    events.push(...sectionEvents(music, sm, step, next ? next.energy : 0));
    marks.push({ id: s.id, step, bars: sm.bars });
    step += sm.bars * 16;
  });
  events.sort((a, b) => a.step - b.step);
  return { events, marks, totalSteps: step, bpm: music.bpm };
}

export function stepSeconds(bpm) { return 60 / bpm / 4; }
