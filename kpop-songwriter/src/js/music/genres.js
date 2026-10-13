// 장르 묶음별 섹션 기본값 (국내 K-pop 기준). 새 곡·새 섹션·템플릿 적용·'장르 기본 편곡' 버튼이 쓴다.
// 근거: docs/research/genre-chords-2026-10-12.md 3-2(섹션별 코드), composition-2026-10-12.md a5~a9(인트로·아웃트로·벌스 비트·브릿지),
// sounds-korean-2026-10-12.md E(발라드는 피아노 → 스트링 → 풀 밴드). 결정: D-022.

// 섹션 한 칸: 마디, 에너지, 악기, 드럼, 베이스, 장조 진행, 단조 진행 (music/theory.js PROGRESSIONS id, 또는 도수 배열)
// 진행이 마디보다 길면 들리는 마디만큼만 쓴다 (arrangement.js). 2마디 아웃트로는 으뜸화음으로 끝나게 5→1(단조 VII→i)
const S = (bars, energy, instruments, drum, bass, major, minor) => ({ bars, energy, instruments, drum, bass, major, minor });
// 클럽은 곡 장르의 리듬(하우스·개러지·저지 등)을 곡 전체에 쓴다
const GROOVE = 'groove';
// 짧은 훅 끝(2마디)의 마침: 장조 V→I, 단조 VII→i (P27 단조 2코드)
const END = [5, 1];
const END_M = [7, 1];

// seventh: true = 모든 섹션 7th, null = 프리셋에 붙은 대로 (예: 4236은 켜고 4536은 끔). 빠르기 범위는 아래 TEMPO
export const GENRE_PROFILES = {
  bright: {
    name: '청량 댄스 팝', mode: 'major', seventh: null,
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
      Outro: S(2, 4, ['drums', 'bass', 'pad', 'pluck'], 'four', 'octave', END, END_M),
    },
  },
  ballad: {
    name: '발라드·OST', mode: 'major', seventh: true,
    sections: {
      Intro: S(4, 1, ['piano'], 'none', 'long', 'ballad', 'dark'),
      Verse: S(8, 2, ['piano', 'bass'], 'none', 'long', 'ballad', 'dark'),
      'Pre-Chorus': S(4, 3, ['piano', 'bass', 'strings'], 'none', 'long', 'chain', 'rise_m'),
      Chorus: S(8, 4, ['drums', 'bass', 'piano', 'strings', 'pad'], 'ballad', 'long', 'ballad44m', 'circle_m'), // 4-4m-3-6 (B01), 단조는 V7로 마치는 순환 (P19)
      'Post-Chorus': S(4, 3, ['drums', 'bass', 'piano', 'strings'], 'ballad', 'long', 'ballad44m', 'sad'), // 후렴과 같게 (3-2)
      Rap: S(8, 2, ['drums', 'bass', 'piano'], 'ballad', 'long', 'ballad', 'dark'),
      Bridge: S(8, 3, ['piano', 'strings', 'pad', 'bass'], 'none', 'long', 'circle', 'bridge4236_m'),
      'Dance Break': S(8, 4, ['drums', 'bass', 'piano', 'strings'], 'ballad', 'long', 'ballad44m', 'sad'),
      Hook: S(4, 4, ['drums', 'bass', 'piano', 'strings', 'pad'], 'ballad', 'long', 'ballad44m', 'sad'),
      Outro: S(4, 1, ['piano'], 'none', 'long', [4, 5, 1, 1], 'epic'),
    },
  },
  // 감미로운 정통 발라드 (중저음 남성 보컬, 피아노·스트링, 4→4m·부속 7화음). seventh는 프리셋에 붙은 대로 (희재형·브릿지는 3화음).
  // 근거: docs/research/ballad-classic-2026-10-12.md 6-1 (18곡 장조, 신스 패드 크레딧 1곡뿐이라 패드를 뺌). 결정: D-027
  ballad_classic: {
    name: '감미로운 정통 발라드', mode: 'major', seventh: null,
    desc: '중저음 남성 보컬 · 피아노와 스트링 · 담담하게 시작해 마지막 후렴에서 열려요',
    sections: {
      Intro: S(4, 1, ['piano', 'strings'], 'none', 'long', 'ballad', 'dark'),
      Verse: S(8, 2, ['piano', 'bass'], 'none', 'long', 'stairs44m', 'dark'),
      'Pre-Chorus': S(4, 3, ['piano', 'bass', 'strings'], 'none', 'long', 'chain67', 'rise_m'),
      Chorus: S(8, 4, ['drums', 'bass', 'piano', 'strings'], 'ballad', 'long', 'ballad44m', 'circle_m'),
      'Post-Chorus': S(4, 3, ['drums', 'bass', 'piano', 'strings'], 'ballad', 'long', 'ballad44m', 'sad'),
      Rap: S(8, 2, ['drums', 'bass', 'piano'], 'ballad', 'long', 'ballad', 'dark'),
      Bridge: S(8, 3, ['piano', 'strings', 'bass'], 'none', 'long', 'mixbridge', 'bridge4236_m'),
      'Dance Break': S(8, 4, ['drums', 'bass', 'piano', 'strings'], 'ballad', 'long', 'ballad44m', 'sad'),
      Hook: S(4, 4, ['drums', 'bass', 'piano', 'strings'], 'ballad', 'long', 'ballad44m', 'sad'),
      Outro: S(4, 1, ['piano'], 'none', 'long', [4, 5, 1, 1], 'epic'),
    },
    // Suno 스타일 시드 (실존 가수·곡 이름 없이, 6-5). 부를 사람이 바리톤이면 vocalsBaritone (D-027)
    seed: {
      genre: 'Korean ballad',
      subgenre: 'mellow piano pop ballad',
      bpm: 68,
      vocals: 'warm soft male vocal, low-mid register, restrained delivery',
      vocalsBaritone: 'warm rich baritone male vocal, low-mid register, restrained delivery',
      instruments: 'piano, string section, soft bass, light drums',
      production: 'piano-led, gentle build to a fuller final chorus',
      extra: 'bittersweet longing',
      exclude: 'EDM, trap beat, synth pads',
    },
  },
  dark: {
    name: '다크·걸크러시·힙합', mode: 'minor', seventh: null,
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
      Outro: S(2, 4, ['drums', 'b808', 'pluck'], 'trap', 'halftime', END, END_M),
    },
  },
  rnb: {
    name: 'R&B·시티팝', mode: 'major', seventh: true,
    sections: {
      Intro: S(4, 3, ['drums', 'bass', 'piano', 'pad'], 'funk', 'sync', 'lilac', 'view'),
      Verse: S(8, 2, ['drums', 'bass', 'piano'], 'funk', 'sync', 'lilac', 'view'),
      'Pre-Chorus': S(4, 3, ['drums', 'bass', 'pad', 'strings'], 'funk', 'sync', 'build', 'rise_m'),
      Chorus: S(8, 4, ['drums', 'bass', 'piano', 'pad', 'strings', 'guitar'], 'funk', 'octave', 'marusa', 'view'), // 4-III7-6-1 (P14)
      'Post-Chorus': S(4, 4, ['drums', 'bass', 'piano', 'guitar'], 'funk', 'octave', 'marusa', 'view'), // 후렴과 같게 (3-2)
      Rap: S(8, 3, ['drums', 'bass', 'piano'], 'funk', 'sync', 'lilac', 'view'),
      Bridge: S(4, 3, ['piano', 'pad', 'strings', 'bass'], 'none', 'long', 'dreamy', 'bridge4236_m'),
      'Dance Break': S(8, 4, ['drums', 'bass', 'piano', 'pad', 'strings', 'guitar'], 'funk', 'octave', 'marusa', 'view'),
      Hook: S(4, 4, ['drums', 'bass', 'piano', 'guitar'], 'funk', 'octave', 'marusa', 'view'),
      Outro: S(2, 3, ['drums', 'bass', 'piano', 'pad'], 'funk', 'sync', END, END_M),
    },
  },
  club: {
    name: '클럽 (하우스·개러지·저지)', mode: 'minor', seventh: true,
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
      Outro: S(2, 3, ['drums', 'bass', 'pad'], GROOVE, 'offbeat', END, END_M),
    },
  },
  band: {
    name: '밴드·록', mode: 'major', seventh: null,
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
      Outro: S(2, 4, ['drums', 'bass', 'guitar'], 'pop', 'root8', END, END_M),
    },
  },
};

export const DEFAULT_GENRE = 'bright';

// 스타일 탭 '장르 스타일로 채우기'에 보일 묶음 (시드가 있는 것)
export const STYLE_SEEDS = Object.entries(GENRE_PROFILES).filter(([, p]) => p.seed).map(([id, p]) => ({ id, name: p.name, desc: p.desc || '' }));

// 시드로 채울 스타일 칸. 멤버 중 바리톤(m-baritone)이 있으면 바리톤 보컬 묘사 (직접 부를 사람의 목소리에 맞춘 가이드)
export function seedStyle(id, song) {
  const s = GENRE_PROFILES[id]?.seed;
  if (!s) return null;
  const baritone = (song?.members || []).some((m) => m.voice === 'm-baritone');
  return {
    genre: s.genre, subgenre: s.subgenre, bpm: s.bpm, vocals: baritone && s.vocalsBaritone ? s.vocalsBaritone : s.vocals,
    instruments: s.instruments, production: s.production, extra: s.extra, exclude: s.exclude,
  };
}

// 장르 칸(자유 입력)·세부 장르에서 묶음 찾기. 위에서부터 먼저 맞는 것 (예: 'K-pop R&B ballad'는 발라드)
// 정통 발라드는 '발라드'와 부드러움 표지(mellow·croon·soft ballad·감미·담백)가 둘 다 있어야 한다 (실존 이름은 Suno로 새므로 넣지 않음, D-027)
const RULES = [
  ['ballad_classic', /^(?=[\s\S]*(?:ballad|발라드))(?=[\s\S]*(?:mellow|croon|soft\s+(?:pop\s+|piano\s+)?ballad|2000s\s+(?:k-?|korean\s+)ballad|감미|담백))/i],
  ['ballad', /ballad|발라드|\bost\b|드라마(?!틱)/i],
  ['club', /brazilian|baile|phonk|브라질리언/i], // 브라질리언 펑크는 R&B의 funk가 아님
  ['rnb', /r&b|r'n'b|\brnb\b|알앤비|알엔비|city\s?pop|시티\s?팝|disco|디스코|\bfunk\b|neo[- ]?soul|new\s?jack|뉴\s?잭/i],
  ['club', /house|하우스|garage(?!\s*(rock|punk))|개러지|\bukg\b|2[- ]?step|jersey|저지|club|클럽|afro|아프로|moombah|뭄바|dembow|reggaeton|레게톤|baltimore|techno|테크노/i],
  ['band', /rock|록|band|밴드|punk|팝\s?펑크|indie|인디/i],
  ['dark', /hip\s?-?hop|힙합|trap|트랩|drill|드릴|\bedm\b/i],
];

// 클럽 묶음의 리듬 (patterns.js DRUM_PATTERNS id)
function grooveOf(text) {
  if (/jersey|저지/i.test(text)) return 'jersey';
  if (/garage|개러지|\bukg\b|2[- ]?step/i.test(text)) return 'ukg';
  if (/afro|아프로/i.test(text)) return 'afro';
  if (/moombah|뭄바|dembow|reggaeton|레게톤/i.test(text)) return 'dembow';
  return 'four';
}

// 빠르기 범위 [낮음, 높음, 권장]. 템플릿 적용·'장르 기본 편곡' 버튼이 범위 밖일 때만 권장값으로 옮긴다. null이면 그대로.
// 발라드·R&B·클럽 리듬별 수치는 조사(composition W15)와 도움말·AI 규칙(R&B 80~100)과 같다.
// 청량·다크·밴드는 조사 수치가 없어 발라드 빠르기에서 돌아오기 위한 넓은 범위만 둔다 (권장값은 앱 기본 120).
const TEMPO = {
  ballad: [60, 80, 72],
  ballad_classic: [60, 72, 68], // 18곡 60~72, 가운데값 67~68 (ballad-classic 1장·6-3)
  rnb: [80, 100, 96],
  bright: [95, 160, 120],
  dark: [85, 180, 120],
  band: [95, 200, 120],
  club: { four: [120, 128, 124], jersey: [130, 140, 135], ukg: [130, 138, 134] }, // 아프로·뎀보는 수치 근거가 없어 그대로
};
const DISCO = /disco|디스코|\bfunk\b|city\s?pop|시티\s?팝/i; // R&B 묶음이어도 디스코·시티팝 결은 빠르기 범위를 두지 않는다

export function tempoRange(genre) {
  if (!genre) return null;
  if (genre.disco) return null;
  const r = TEMPO[genre.id];
  return r && !Array.isArray(r) ? r[genre.groove || 'four'] || null : r || null;
}

// 곡의 장르 묶음: {id, name, groove, disco}. 장르 칸에서 못 찾으면 청량, 분위기에 걸크러시·다크가 있으면 다크 (genre-chords 3-2 매핑)
export function songGenre(song) {
  const text = [song?.style?.genre, song?.style?.subgenre].filter(Boolean).join(' ');
  let id = (RULES.find(([, re]) => re.test(text)) || [DEFAULT_GENRE])[0];
  const moods = song?.concept?.moods || [];
  if (id === DEFAULT_GENRE && (moods.includes('걸크러시') || moods.includes('다크'))) id = 'dark';
  return { id, name: GENRE_PROFILES[id].name, groove: grooveOf(text), disco: id === 'rnb' && DISCO.test(text) };
}

// '발라드·미디엄 템포' 템플릿: 장르 칸이 발라드·R&B가 아니면 'K-pop ballad'로 바꿔, 뒤에 더하는 섹션·버튼·AI 편곡도 같은 장르를 보게 한다
export const BALLAD_GENRE = 'K-pop ballad';
export function templateStyleGenre(key, song) {
  if (key !== 'ballad') return null;
  const id = songGenre(song).id;
  return id === 'ballad' || id === 'ballad_classic' || id === 'rnb' ? null : BALLAD_GENRE;
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

// 권장 빠르기 범위 밖이면 권장값, 안이면 그대로 (범위가 없으면 그대로)
export function fitBpm(bpm, genre) {
  const r = tempoRange(genre);
  if (!r) return bpm;
  return bpm >= r[0] && bpm <= r[1] ? bpm : r[2];
}
