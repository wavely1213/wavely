// 편곡 데이터: 곡 전체(빠르기·키·음색) + 섹션별(마디, 코드, 에너지, 악기, 드럼, 베이스, 멜로디).
import { defaultSounds, INSTRUMENTS } from './instruments.js';
import { PROGRESSIONS } from './theory.js';

const BY_TYPE = {
  Intro: { bars: 4, energy: 2, instruments: ['pad', 'arp'], drum: 'none', bass: 'long', prog: 'hope' },
  Verse: { bars: 8, energy: 2, instruments: ['drums', 'bass', 'piano'], drum: 'pop', bass: 'sync', prog: 'emotional' },
  'Pre-Chorus': { bars: 4, energy: 3, instruments: ['drums', 'bass', 'pad', 'arp'], drum: 'pop', bass: 'root8', prog: 'build' },
  Chorus: { bars: 8, energy: 5, instruments: ['drums', 'bass', 'pad', 'pluck', 'strings'], drum: 'four', bass: 'octave', prog: 'royal' },
  'Post-Chorus': { bars: 4, energy: 4, instruments: ['drums', 'b808', 'pluck'], drum: 'jersey', bass: 'halftime', prog: 'royal' },
  Rap: { bars: 8, energy: 3, instruments: ['drums', 'b808'], drum: 'trap', bass: 'halftime', prog: 'simple' },
  Bridge: { bars: 4, energy: 2, instruments: ['piano', 'strings'], drum: 'none', bass: 'long', prog: 'emotional' },
  'Dance Break': { bars: 8, energy: 5, instruments: ['drums', 'b808', 'pluck', 'arp'], drum: 'jersey', bass: 'halftime', prog: 'simple' },
  Hook: { bars: 4, energy: 4, instruments: ['drums', 'bass', 'pluck'], drum: 'four', bass: 'octave', prog: 'royal' },
  Outro: { bars: 4, energy: 1, instruments: ['pad', 'piano'], drum: 'none', bass: 'long', prog: 'hope' },
};

function progressionFor(mode, id) {
  const list = PROGRESSIONS[mode] || PROGRESSIONS.major;
  return list.find((p) => p.id === id) || list[0];
}

export function defaultSectionMusic(type, mode = 'major') {
  const d = BY_TYPE[type] || BY_TYPE.Verse;
  const minorId = { hope: 'sad', emotional: 'sad', royal: 'epic', build: 'build', simple: 'trap' }[d.prog];
  const p = progressionFor(mode, mode === 'minor' ? minorId : d.prog);
  return {
    bars: d.bars,
    chords: [...p.degrees],
    seventh: !!p.seventh,
    energy: d.energy,
    instruments: [...d.instruments],
    drum: d.drum,
    drumGrid: null, // 직접 찍은 드럼 (있으면 프리셋 대신 사용)
    bass: d.bass,
    melody: [],
  };
}

export function defaultMusic() {
  return { bpm: 120, root: 0, mode: 'major', sections: {}, sounds: defaultSounds() };
}

// 저장된 곡에 편곡 데이터가 없거나 섹션이 바뀌었으면 맞춰 준다
export function normalizeMusic(song) {
  if (!song.music) song.music = defaultMusic();
  const m = song.music;
  const sounds = defaultSounds();
  INSTRUMENTS.forEach((i) => { m.sounds[i.id] = { ...sounds[i.id], ...(m.sounds?.[i.id] || {}) }; });
  const ids = new Set(song.sections.map((s) => s.id));
  song.sections.forEach((s) => {
    if (!m.sections[s.id]) m.sections[s.id] = defaultSectionMusic(s.type, m.mode);
    const sm = m.sections[s.id];
    if (!Array.isArray(sm.melody)) sm.melody = [];
  });
  Object.keys(m.sections).forEach((id) => { if (!ids.has(id)) delete m.sections[id]; });
  if (!Array.isArray(song.references)) song.references = [];
  return song;
}

// 초보자용 한 번에 바꾸기 (AI 없이, 사용량 들지 않음)
export const QUICK_TWEAKS = {
  hype: {
    name: '더 신나게',
    apply(sm) {
      sm.energy = Math.min(5, sm.energy + 1);
      if (!sm.instruments.includes('drums')) sm.instruments.push('drums');
      if (sm.drum === 'none' || sm.drum === 'ballad') sm.drum = 'pop';
      else if (sm.drum === 'pop') sm.drum = 'four';
      if (sm.energy >= 4 && !sm.instruments.includes('pluck')) sm.instruments.push('pluck');
      if (sm.bass === 'long') sm.bass = 'root8';
    },
  },
  calm: {
    name: '더 잔잔하게',
    apply(sm) {
      sm.energy = Math.max(1, sm.energy - 1);
      if (sm.energy <= 2) sm.instruments = sm.instruments.filter((i) => !['pluck', 'arp', 'b808'].includes(i));
      if (sm.energy <= 1) sm.instruments = sm.instruments.filter((i) => i !== 'drums');
      if (['four', 'jersey', 'trap', 'dembow', 'funk'].includes(sm.drum)) sm.drum = 'pop';
      else if (sm.drum === 'pop') sm.drum = 'ballad';
      sm.bass = 'long';
      if (!sm.instruments.includes('pad') && !sm.instruments.includes('piano')) sm.instruments.push('pad');
    },
  },
  dreamy: {
    name: '더 몽환적으로',
    apply(sm) {
      sm.seventh = true;
      sm.instruments = sm.instruments.filter((i) => i !== 'guitar');
      ['pad', 'arp'].forEach((i) => { if (!sm.instruments.includes(i)) sm.instruments.push(i); });
    },
  },
  heavy: {
    name: '더 묵직하게',
    apply(sm) {
      sm.instruments = sm.instruments.filter((i) => i !== 'bass');
      if (!sm.instruments.includes('b808')) sm.instruments.push('b808');
      if (!sm.instruments.includes('drums')) sm.instruments.push('drums');
      sm.drum = 'trap';
      sm.bass = 'halftime';
    },
  },
};

export function sectionBars(song) {
  return song.sections.map((s) => song.music.sections[s.id]?.bars || 4);
}

export function songSeconds(song) {
  const bars = sectionBars(song).reduce((a, b) => a + b, 0);
  return (bars * 4 * 60) / song.music.bpm;
}
