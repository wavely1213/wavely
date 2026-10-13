// 편곡 데이터: 곡 전체(빠르기·키·음색) + 섹션별(마디, 코드, 에너지, 악기, 드럼, 베이스, 멜로디).
// 섹션 기본값은 곡의 장르 묶음(music/genres.js)을 따른다. 이미 있는 섹션 편곡은 바꾸지 않는다.
import { defaultSounds, INSTRUMENTS } from './instruments.js';
import { PROGRESSIONS } from './theory.js';
import { songGenre, templateStyleGenre, genreSection, fitBpm } from './genres.js';

function progressionFor(mode, id) {
  const list = PROGRESSIONS[mode] || PROGRESSIONS.major;
  return list.find((p) => p.id === id) || list[0];
}

// 섹션 기본 편곡. genre는 songGenre(song)의 결과 (없으면 청량 댄스 팝). 장르 묶음 표는 music/genres.js.
// bars를 주면 그 마디 수에 맞춘다 (버튼은 마디를 그대로 둠). 진행이 마디보다 길면 들리는 마디만큼만 남긴다 (재생은 마디마다 코드 하나).
// 아웃트로와 끝이 중요한 진행(프리셋 keepEnd, 예: 후렴으로 돌아오는 2–5)은 앞 절반 + 뒤 절반을 남긴다 (예: 아웃트로 [4,5,1,1] 2마디 → [4,1])
function fitChords(degrees, n, keepEnd) {
  if (degrees.length <= n) return degrees.slice();
  if (!keepEnd) return degrees.slice(0, n);
  return n <= 1 ? degrees.slice(-1) : [...degrees.slice(0, Math.ceil(n / 2)), ...degrees.slice(degrees.length - Math.floor(n / 2))];
}

export function defaultSectionMusic(type, mode = 'major', genre, bars) {
  const d = genreSection(type, mode, genre);
  const p = Array.isArray(d.prog) ? { degrees: d.prog, seventh: false } : progressionFor(mode, d.prog);
  const n = bars || d.bars;
  return {
    bars: n,
    chords: fitChords(p.degrees, Math.max(n, 1), type === 'Outro' || !!p.keepEnd),
    seventh: d.seventh ?? !!p.seventh,
    energy: d.energy,
    instruments: d.instruments,
    drum: d.drum,
    drumGrid: null, // 직접 찍은 드럼 (있으면 프리셋 대신 사용)
    bass: d.bass,
    melody: [],
  };
}

// '장르 기본 편곡' (편곡 탭 버튼, 발라드 템플릿): 섹션의 코드·7th·에너지·악기·드럼·베이스를 장르 기본값으로 바꾼다.
// 마디 수와 멜로디는 그대로 두고 (가사·멜로디 맞춤을 지킴), 빠르기는 장르 권장 범위 밖일 때만 옮긴다. ids를 주면 그 섹션만.
export function applyGenreDefaults(song, genre = songGenre(song), ids = null) {
  const m = song.music;
  song.sections.forEach((s) => {
    const sm = m.sections[s.id];
    if (!sm || (ids && !ids.includes(s.id))) return;
    const d = defaultSectionMusic(s.type, m.mode, genre, sm.bars);
    Object.assign(sm, { chords: d.chords, seventh: d.seventh, energy: d.energy, instruments: d.instruments, drum: d.drum, drumGrid: null, bass: d.bass });
  });
  m.bpm = fitBpm(m.bpm, genre);
  return song;
}

// 구조 템플릿을 적용한 뒤 (mutate 안에서, 섹션을 바꾼 직후): 새 섹션을 곡 장르 기본값으로 채우고 빠르기를 장르 범위에 맞춘다.
// '발라드·미디엄 템포'는 장르 칸이 발라드·R&B가 아니면 'K-pop ballad'로 바꾼다 (뒤에 더하는 섹션·버튼·AI 편곡·Suno 스타일도 같은 장르를 보게).
export function applyTemplateDefaults(song, key) {
  const m = song.music;
  const g = templateStyleGenre(key, song);
  if (g) song.style = { ...song.style, genre: g };
  const genre = songGenre(song);
  song.sections.forEach((s) => { if (!m.sections[s.id]) m.sections[s.id] = defaultSectionMusic(s.type, m.mode, genre); });
  m.bpm = fitBpm(m.bpm, genre);
  return song;
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
  const genre = song.sections.some((s) => !m.sections[s.id]) ? songGenre(song) : null; // 새 섹션은 곡 장르 기본값으로
  song.sections.forEach((s) => {
    if (!m.sections[s.id]) m.sections[s.id] = defaultSectionMusic(s.type, m.mode, genre);
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
