// 장르 묶음별 섹션 기본값 (국내 K-pop 기준). 새 곡·새 섹션·템플릿 적용·'장르 기본 편곡' 버튼이 쓴다.
// 근거: docs/research/genre-chords-2026-10-12.md 3-2(섹션별 코드), composition-2026-10-12.md a5~a9(인트로·아웃트로·벌스 비트·브릿지),
// sounds-korean-2026-10-12.md E(발라드는 피아노 → 스트링 → 풀 밴드). 결정: D-022.

// 섹션 한 칸: 마디, 에너지, 악기, 드럼, 베이스, 장조 진행 id, 단조 진행 id (music/theory.js PROGRESSIONS)
const S = (bars, energy, instruments, drum, bass, major, minor) => ({ bars, energy, instruments, drum, bass, major, minor });
// 클럽은 곡 장르의 리듬(하우스·개러지·저지 등)을 곡 전체에 쓴다
const GROOVE = 'groove';

// seventh: true = 모든 섹션 7th, null = 프리셋에 붙은 대로 (예: 4236은 켜고 4536은 끔)
// bpm: [낮음, 높음, 권장]. 템플릿·버튼이 이 범위 밖이면 권장값으로 옮긴다. null이면 빠르기를 건드리지 않는다
export const GENRE_PROFILES = {
  bright: {
    name: '청량 댄스 팝', mode: 'major', seventh: null, bpm: null,
    sections: {
      Intro: S(4, 3, ['drums', 'bass', 'pluck', 'pad'], 'four', 'root8', 'royal', 'turn6345_m'),
      Verse: S(8, 2, ['drums', 'bass', 'piano', 'pluck'], 'four', 'sync', 'lilac', 'sad'),
      'Pre-Chorus': S(4, 3, ['drums', 'bass', 'pad', 'arp'], 'four', 'root8', 'rise', 'rise_m'),
      Chorus: S(8, 5, ['drums', 'bass', 'pad', 'pluck', 'strings'], 'four', 'octave', 'royal', 'epic'),
      'Post-Chorus': S(4, 4, ['drums', 'b808', 'pluck'], 'jersey', 'halftime', 'royal', 'epic'),
      Rap: S(8, 3, ['drums', 'b808'], 'trap', 'halftime', 'lilac', 'vamp_iv'),
      Bridge: S(4, 3, ['drums', 'bass', 'pad', 'strings'], 'trap', 'long', 'build', 'build'),
      'Dance Break': S(8, 5, ['drums', 'b808', 'pluck', 'arp'], 'jersey', 'halftime', 'royal', 'epic'),
      Hook: S(4, 4, ['drums', 'bass', 'pluck'], 'four', 'octave', 'royal', 'epic'),
      Outro: S(2, 4, ['drums', 'bass', 'pad', 'pluck'], 'four', 'octave', 'royal', 'epic'),
    },
  },
  ballad: {
    name: '발라드·OST', mode: 'major', seventh: true, bpm: [60, 80, 72],
    sections: {
      Intro: S(4, 1, ['piano'], 'none', 'long', 'ballad', 'dark'),
      Verse: S(8, 2, ['piano', 'bass'], 'none', 'long', 'ballad', 'dark'),
      'Pre-Chorus': S(4, 3, ['piano', 'bass', 'strings'], 'none', 'long', 'chain', 'rise_m'),
      Chorus: S(8, 4, ['drums', 'bass', 'piano', 'strings', 'pad'], 'ballad', 'long', 'royal8', 'sad'),
      'Post-Chorus': S(4, 3, ['drums', 'bass', 'piano', 'strings'], 'ballad', 'long', 'royal', 'sad'),
      Rap: S(8, 2, ['drums', 'bass', 'piano'], 'ballad', 'long', 'ballad', 'dark'),
      Bridge: S(8, 3, ['piano', 'strings', 'pad', 'bass'], 'none', 'long', 'circle', 'bridge4236_m'),
      'Dance Break': S(8, 4, ['drums', 'bass', 'piano', 'strings'], 'ballad', 'long', 'royal8', 'sad'),
      Hook: S(4, 4, ['drums', 'bass', 'piano', 'strings', 'pad'], 'ballad', 'long', 'royal', 'sad'),
      Outro: S(4, 1, ['piano'], 'none', 'long', 'ballad', 'dark'),
    },
  },
  dark: {
    name: '다크·걸크러시·힙합', mode: 'minor', seventh: null, bpm: null,
    sections: {
      Intro: S(4, 3, ['drums', 'b808', 'arp'], 'trap', 'halftime', 'royal', 'turn6345_m'),
      Verse: S(8, 2, ['drums', 'b808', 'pluck'], 'trap', 'halftime', 'emotional', 'sad'),
      'Pre-Chorus': S(4, 3, ['drums', 'bass', 'pad', 'arp'], 'trap', 'root8', 'rise', 'rise_m'),
      Chorus: S(8, 5, ['drums', 'b808', 'pluck', 'pad', 'strings'], 'trap', 'halftime', 'royal', 'epic'),
      'Post-Chorus': S(4, 4, ['drums', 'b808', 'pluck'], 'trap', 'halftime', 'drop', 'drop'),
      Rap: S(8, 3, ['drums', 'b808'], 'trap', 'halftime', 'simple', 'vamp_iv'),
      Bridge: S(4, 3, ['piano', 'pad', 'strings', 'bass'], 'none', 'long', 'build', 'bridge4236_m'),
      'Dance Break': S(8, 5, ['drums', 'b808', 'pluck', 'arp'], 'jersey', 'halftime', 'drop', 'drop'),
      Hook: S(4, 4, ['drums', 'b808', 'pluck'], 'trap', 'halftime', 'royal', 'epic'),
      Outro: S(2, 4, ['drums', 'b808', 'pluck'], 'trap', 'halftime', 'royal', 'epic'),
    },
  },
  rnb: {
    name: 'R&B·시티팝', mode: 'major', seventh: true, bpm: [80, 110, 96],
    sections: {
      Intro: S(4, 3, ['drums', 'bass', 'piano', 'pad'], 'funk', 'sync', 'lilac', 'view'),
      Verse: S(8, 2, ['drums', 'bass', 'piano'], 'funk', 'sync', 'lilac', 'view'),
      'Pre-Chorus': S(4, 3, ['drums', 'bass', 'pad', 'strings'], 'funk', 'sync', 'build', 'rise_m'),
      Chorus: S(8, 4, ['drums', 'bass', 'piano', 'pad', 'strings', 'guitar'], 'funk', 'octave', 'citypop', 'view'),
      'Post-Chorus': S(4, 4, ['drums', 'bass', 'piano', 'guitar'], 'funk', 'octave', 'citypop', 'view'),
      Rap: S(8, 3, ['drums', 'bass', 'piano'], 'funk', 'sync', 'lilac', 'view'),
      Bridge: S(4, 3, ['piano', 'pad', 'strings', 'bass'], 'none', 'long', 'dreamy', 'bridge4236_m'),
      'Dance Break': S(8, 4, ['drums', 'bass', 'piano', 'pad', 'strings', 'guitar'], 'funk', 'octave', 'citypop', 'view'),
      Hook: S(4, 4, ['drums', 'bass', 'piano', 'guitar'], 'funk', 'octave', 'citypop', 'view'),
      Outro: S(2, 3, ['drums', 'bass', 'piano', 'pad'], 'funk', 'sync', 'citypop', 'view'),
    },
  },
  club: {
    name: '클럽 (하우스·개러지·저지)', mode: 'minor', seventh: true, bpm: [118, 140, 124],
    sections: {
      Intro: S(4, 3, ['drums', 'bass', 'pad'], GROOVE, 'offbeat', 'citypop', 'view'),
      Verse: S(8, 2, ['drums', 'bass', 'pluck'], GROOVE, 'offbeat', 'citypop', 'view'),
      'Pre-Chorus': S(4, 3, ['drums', 'bass', 'pad', 'arp'], GROOVE, 'offbeat', 'citypop', 'view'),
      Chorus: S(8, 5, ['drums', 'bass', 'pad', 'pluck', 'arp'], GROOVE, 'offbeat', 'citypop', 'view'),
      'Post-Chorus': S(4, 4, ['drums', 'b808', 'pluck'], GROOVE, 'halftime', 'citypop', 'view'),
      Rap: S(8, 3, ['drums', 'b808'], GROOVE, 'halftime', 'citypop', 'view'),
      Bridge: S(4, 2, ['pad', 'strings', 'bass'], 'none', 'long', 'citypop', 'view'),
      'Dance Break': S(8, 5, ['drums', 'b808', 'pluck', 'arp'], GROOVE, 'halftime', 'drop', 'drop'),
      Hook: S(4, 4, ['drums', 'bass', 'pluck'], GROOVE, 'offbeat', 'citypop', 'view'),
      Outro: S(2, 3, ['drums', 'bass', 'pad'], GROOVE, 'offbeat', 'citypop', 'view'),
    },
  },
  band: {
    name: '밴드·록', mode: 'major', seventh: null, bpm: null,
    sections: {
      Intro: S(4, 3, ['drums', 'bass', 'guitar'], 'pop', 'root8', 'hope', 'dark'),
      Verse: S(8, 2, ['drums', 'bass', 'guitar'], 'pop', 'root8', 'hope', 'dark'),
      'Pre-Chorus': S(4, 3, ['drums', 'bass', 'guitar', 'pad'], 'pop', 'root8', 'rise', 'rise_m'),
      Chorus: S(8, 5, ['drums', 'bass', 'guitar', 'piano', 'strings'], 'pop', 'root8', 'band4156', 'loop6514_m'),
      'Post-Chorus': S(4, 4, ['drums', 'bass', 'guitar', 'piano'], 'pop', 'root8', 'band4156', 'loop6514_m'),
      Rap: S(8, 2, ['drums', 'bass', 'guitar'], 'pop', 'root8', 'hope', 'dark'),
      Bridge: S(4, 3, ['drums', 'bass', 'guitar', 'strings'], 'ballad', 'long', 'build', 'build'),
      'Dance Break': S(8, 5, ['drums', 'bass', 'guitar', 'piano', 'strings'], 'pop', 'root8', 'band4156', 'loop6514_m'),
      Hook: S(4, 4, ['drums', 'bass', 'guitar', 'piano'], 'pop', 'root8', 'band4156', 'loop6514_m'),
      Outro: S(2, 4, ['drums', 'bass', 'guitar'], 'pop', 'root8', 'band4156', 'loop6514_m'),
    },
  },
};

export const DEFAULT_GENRE = 'bright';

// 장르 칸(자유 입력)·세부 장르에서 묶음 찾기. 위에서부터 먼저 맞는 것 (예: 'K-pop R&B ballad'는 발라드)
const RULES = [
  ['ballad', /ballad|발라드|\bost\b|드라마/i],
  ['club', /brazilian|baile|phonk|브라질리언/i], // 브라질리언 펑크는 R&B의 funk가 아님
  ['rnb', /r&b|r'n'b|\brnb\b|알앤비|city\s?pop|시티\s?팝|disco|디스코|\bfunk\b|neo[- ]?soul/i],
  ['club', /house|하우스|garage|\bukg\b|2-step|jersey|저지|club|클럽|afro|아프로|moombah|뭄바|dembow|reggaeton|레게톤|baltimore|techno|테크노/i],
  ['band', /rock|록|band|밴드|punk|indie|인디/i],
  ['dark', /hip\s?-?hop|힙합|trap|트랩|drill|드릴|\bedm\b/i],
];

// 클럽 묶음의 리듬 (patterns.js DRUM_PATTERNS id)
function grooveOf(text) {
  if (/jersey|저지/i.test(text)) return 'jersey';
  if (/garage|\bukg\b|2-step/i.test(text)) return 'ukg';
  if (/afro|아프로/i.test(text)) return 'afro';
  if (/moombah|뭄바|dembow|reggaeton|레게톤/i.test(text)) return 'dembow';
  return 'four';
}

// 곡의 장르 묶음: {id, name, groove}. 장르 칸에서 못 찾으면 청량, 분위기에 걸크러시·다크가 있으면 다크 (genre-chords 3-2 매핑)
export function songGenre(song) {
  const text = [song?.style?.genre, song?.style?.subgenre].filter(Boolean).join(' ');
  let id = (RULES.find(([, re]) => re.test(text)) || [DEFAULT_GENRE])[0];
  const moods = song?.concept?.moods || [];
  if (id === DEFAULT_GENRE && (moods.includes('걸크러시') || moods.includes('다크'))) id = 'dark';
  return { id, name: GENRE_PROFILES[id].name, groove: grooveOf(text) };
}

// 템플릿이 정하는 묶음: '발라드·미디엄 템포'는 발라드(장르가 R&B면 R&B), 나머지는 곡 장르대로
export function templateGenre(key, song) {
  const g = songGenre(song);
  if (key !== 'ballad' || g.id === 'rnb' || g.id === 'ballad') return g;
  return { ...g, id: 'ballad', name: GENRE_PROFILES.ballad.name };
}

// 섹션 기본값 재료 (진행 id는 조에 맞춰 고른 것)
export function genreSection(type, mode, genre = { id: DEFAULT_GENRE }) {
  const p = GENRE_PROFILES[genre?.id] || GENRE_PROFILES[DEFAULT_GENRE];
  const d = p.sections[type] || p.sections.Verse;
  return {
    bars: d.bars,
    energy: d.energy,
    instruments: [...d.instruments],
    drum: d.drum === GROOVE ? genre?.groove || 'four' : d.drum,
    bass: d.bass,
    prog: mode === 'minor' ? d.minor : d.major,
    seventh: p.seventh,
  };
}

// 묶음의 권장 빠르기 범위 밖이면 권장값, 안이면 그대로 (범위 없는 묶음은 그대로)
export function fitBpm(bpm, genre) {
  const r = GENRE_PROFILES[genre?.id]?.bpm;
  if (!r) return bpm;
  return bpm >= r[0] && bpm <= r[1] ? bpm : r[2];
}
