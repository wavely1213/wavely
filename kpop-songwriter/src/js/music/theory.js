// 음악 이론: 키, 스케일, 코드. 초보자는 "느낌" 이름으로 고르고, 내부는 스케일 도수로 저장한다.

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
export const MODE_LABEL = { major: '밝은 느낌 (장조)', minor: '어두운 느낌 (단조)' };

// 각 도수 코드의 쉬운 설명 (코드 칩 고를 때 보여 줌)
export const DEGREE_FEEL = {
  major: ['집 같은 안정', '살짝 아련', '쓸쓸', '따뜻하게 열림', '다음으로 끌어당김', '감성적', '긴장'],
  minor: ['어둡고 단단', '불안', '밝게 전환', '깊은 슬픔', '쓸쓸한 긴장', '웅장', '힘차게 올라감'],
};

export function scaleOf(mode) { return SCALES[mode] || SCALES.major; }

// 스케일 인덱스(0 = 4옥타브 으뜸음) → MIDI 노트
export function degreeToMidi(root, mode, idx, base = 60) {
  const sc = scaleOf(mode);
  const oct = Math.floor(idx / 7);
  const step = ((idx % 7) + 7) % 7;
  return base + root + sc[step] + 12 * oct;
}

// 코드 한 칸: 도수 숫자(1~7, 음계 안 화음) 또는 음계 밖 화음 글자 (D-025, 프리셋으로만 넣는다)
//   '4m'  = 그 도수의 단3화음 (장조의 iv, 빌려온 화음)
//   '5M'  = 그 도수의 장3화음 (단조의 V·IV·I)
//   '3d7' = 그 도수의 도미넌트 7 (III7·VI7 = 세컨더리 도미넌트, 단조의 V7)
//   'b7M' = 장음계 도수를 반음 내린 장3화음 (♭VII, 단조의 ♭II). ♭는 조와 상관없이 장음계 기준이라 장·단조를 바꿔도 같은 음이다
const CHORD_TOKEN = /^(b?)([1-7])(M|m|d7)$/;
const QUALITY = { M: [0, 4, 7], m: [0, 3, 7], d7: [0, 4, 7, 10] };

export function isChord(c) {
  return (Number.isInteger(c) && c >= 1 && c <= 7) || (typeof c === 'string' && CHORD_TOKEN.test(c));
}

// {d: 도수, flat: 반음 내림, q: M|m|d7|null(음계 안)}
export function parseChord(c) {
  if (typeof c === 'string') {
    const mt = CHORD_TOKEN.exec(c);
    if (mt) return { d: Number(mt[2]), flat: !!mt[1], q: mt[3] };
  }
  const d = Math.min(7, Math.max(1, Math.round(Number(c)) || 1));
  return { d, flat: false, q: null };
}

export const isDiatonic = (c) => parseChord(c).q === null;

// 코드의 구성음 MIDI (3옥타브 근처). 음계 안 화음은 스케일 3도 쌓기, 음계 밖 화음은 정해진 음정
// seventh: 섹션의 7th 켜기 — 단3화음 → m7, ♭ 장3화음 → maj7(♭VIImaj7·♭IImaj7), 그 밖의 장3화음은 지금 음계의 7음을 얹는다
// (단조의 V → V7, 도리안 IV → IV7, 장조의 II → II7), 도미넌트 7은 그대로
export function chordNotes(root, mode, chord, seventh = false) {
  const { d, flat, q } = parseChord(chord);
  const i = d - 1;
  if (!q) {
    const idxs = seventh ? [i, i + 2, i + 4, i + 6] : [i, i + 2, i + 4];
    return idxs.map((x) => degreeToMidi(root, mode, x, 48));
  }
  const base = flat ? 48 + root + SCALES.major[i] - 1 : degreeToMidi(root, mode, i, 48);
  const iv = [...QUALITY[q]];
  if (seventh && q !== 'd7') iv.push(q === 'm' ? 10 : flat ? 11 : degreeToMidi(root, mode, i + 6, 48) - base);
  return iv.map((x) => base + x);
}

export function chordName(root, mode, chord, seventh = false) {
  const n = chordNotes(root, mode, chord, seventh);
  const third = n[1] - n[0];
  const fifth = n[2] - n[0];
  let q = third === 3 ? (fifth === 6 ? 'dim' : 'm') : '';
  if (n.length > 3) {
    const sev = n[3] - n[0];
    if (q === '') q = sev === 11 ? 'maj7' : '7';
    else if (q === 'm') q = 'm7';
    else q = 'm7b5';
  }
  // 반음 내린 화음은 ♭ 이름으로 (B♭, A♭)
  return (parseChord(chord).flat ? FLAT_NAMES : NOTE_NAMES)[((n[0] % 12) + 12) % 12] + q;
}
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

// 코드 구성음의 음이름 번호(0~11) — 멜로디 화면의 '어울리는 줄' 칠하기용 (3화음만)
export function chordPitchClasses(root, mode, chord) {
  return chordNotes(root, mode, chord, false).slice(0, 3).map((n) => ((n % 12) + 12) % 12);
}

// 음계 밖 글자가 이 조의 음계 안 3화음과 같은 음이면 그 도수 숫자로 바꾼다 (장·단조를 바꾼 뒤, AI 답).
// 예: 단조의 '4m' → 4, 장조의 '5M' → 5, 단조의 'b7M' → 7. 도미넌트 7과 음계 밖 화음은 그대로
export function canonicalChord(mode, chord) {
  const p = parseChord(chord);
  if (!p.q || p.q === 'd7') return chord;
  const key = chordPitchClasses(0, mode, chord).join(',');
  for (let k = 1; k <= 7; k++) if (chordPitchClasses(0, mode, k).join(',') === key) return k;
  return chord;
}

// 음계 밖 화음의 쉬운 설명 (코드 칩). 음계 안 3화음과 같은 글자는 그 도수의 설명으로
export function chordFeel(mode, chord) {
  const { d, flat, q } = parseChord(canonicalChord(mode, chord));
  if (!q) return DEGREE_FEEL[mode][d - 1];
  if (q === 'd7') return mode === 'minor' && d === 5 ? '강하게 끌어당김 (화성단음계)' : '다음 화음으로 끌어당김 (세컨더리)';
  if (flat) return mode === 'minor' && d === 2 ? '이국적인 긴장 (♭II)' : '탁 트이는 빌려온 화음';
  if (q === 'm') return '아련하게 꺾임 (빌려온 화음)';
  if (mode === 'minor' && d === 5) return '강하게 끌어당김 (화성단음계 V)';
  if (mode === 'minor' && d === 4) return '밝게 비틀림 (도리안 IV)';
  if (mode === 'minor' && d === 1) return '밝게 끝남 (장3화음 I)';
  return '음계 밖 화음';
}

export function keyName(root, mode) {
  return `${NOTE_NAMES[root]} ${mode === 'minor' ? 'minor' : 'major'}`;
}

// 느낌 이름으로 고르는 코드 진행 (마디당 코드 1개, 마디 수만큼 반복).
// 국내 K-pop에서 흔한 진행을 둔다 (근거: docs/research/genre-chords-2026-10-12.md). 괄호는 국내 통칭, use는 쓰는 곳(편곡 AI에 보냄).
// 음계 밖 화음은 프리셋으로만 넣는다 (코드 칩은 음계 안 1~7과 지금 고른 화음만 보여 줌, D-025).
// 단조 trap·mystic은 근거가 약하지만 저장된 곡의 프리셋 이름을 지키려고 남겼다 (D-021). '머니코드'는 가리키는 진행이 출처마다 달라 이름에 쓰지 않는다.
// id는 저장·기본값에서 쓰므로 바꾸지 않는다. 같은 조에서 도수가 겹치면 안 된다 (findProgression이 도수로 찾는다).
export const PROGRESSIONS = {
  major: [
    { id: 'hope', name: '희망차고 밝은 (1564)', degrees: [1, 5, 6, 4], use: '발라드·청량·밴드 벌스와 후렴' },
    { id: 'emotional', name: '애절하고 감성적인 (6415)', degrees: [6, 4, 1, 5], use: '발라드·청량·밴드 벌스와 후렴' },
    { id: 'royal', name: '두근두근 고조 (4536 왕도)', degrees: [4, 5, 3, 6], use: '발라드·청량·밴드 후렴 첫머리, 프리코러스' },
    { id: 'royal8', name: '벅차게 고조 (4536 왕도 확장)', degrees: [4, 5, 3, 6, 2, 5, 1, 1], use: '발라드·청량 후렴' },
    { id: 'rise', name: '터지기 직전 (4561)', degrees: [4, 5, 6, 1], use: '청량·밴드 프리코러스' },
    { id: 'band4156', name: '시원하게 뻗는 (4156)', degrees: [4, 1, 5, 6], use: '밴드 후렴, 프리코러스' },
    { id: 'poem', name: '잔잔하고 서정적인 (1364)', degrees: [1, 3, 6, 4], use: '발라드·밴드 후렴과 벌스' },
    { id: 'ballad', name: '따뜻하게 흐르는 (캐논 8코드)', degrees: [1, 5, 6, 3, 4, 1, 4, 5], use: '발라드·청량 벌스와 후렴' },
    { id: 'lilac', name: '산뜻하고 세련된 (4236, 7th)', degrees: [4, 2, 3, 6], seventh: true, use: '청량·R&B 벌스, 후렴 루프' },
    { id: 'dreamy', name: '그루비한 투파이브 (2516, R&B·디스코)', degrees: [2, 5, 1, 6], seventh: true, use: 'R&B·디스코 벌스와 후렴' },
    { id: 'citypop', name: '도시적이고 세련된 (4361, 7th)', degrees: [4, 3, 6, 1], seventh: true, use: 'R&B·댄스·클럽 후렴' },
    { id: 'build', name: '한 계단씩 오르는 (2345)', degrees: [2, 3, 4, 5], use: '프리코러스·브릿지' },
    // 음계 밖 화음이 든 진행 (D-025): 빌려온 4m, 세컨더리 도미넌트, ♭VII
    { id: 'ballad44m', name: '애틋하게 꺾이는 (4-4m-3-6, 발라드 후렴)', degrees: [4, '4m', 3, 6, 2, 5, 1, 1], seventh: true, use: '발라드·OST 후렴' },
    { id: 'spring', name: '아련하게 맺는 (1-3-4-4m)', degrees: [1, 3, 4, '4m'], use: '발라드·밴드 후렴' },
    { id: 'marusa', name: '세련되게 조이는 (4-III7-6-1, 마루사)', degrees: [4, '3d7', 6, 1], seventh: true, use: '청량·R&B 후렴' },
    { id: 'secdom', name: '울컥하게 오르는 (1-III7-4-4m)', degrees: [1, '3d7', 4, '4m'], use: '발라드·R&B 후렴' },
    { id: 'rain', name: '촉촉하게 이어지는 (1-4-3-VI7)', degrees: [1, 4, 3, '6d7'], seventh: true, use: '발라드 벌스' },
    { id: 'mixture', name: '탁 트이는 (1-♭VII-4-5)', degrees: [1, 'b7M', 4, 5], use: '청량·밴드 후렴·인트로' },
    { id: 'chain', name: '이어 붙는 투파이브 (3625, 7th)', degrees: [3, 6, 2, 5], seventh: true, use: '발라드 프리코러스' },
    { id: 'circle', name: '한 바퀴 도는 (4736·2511 순환, 7th)', degrees: [4, 7, 3, 6, 2, 5, 1, 1], seventh: true, use: '발라드 브릿지' },
    { id: 'simple', name: '단순 반복 (1-4 두 코드)', degrees: [1, 4], use: '벌스' },
    { id: 'drop', name: '한 코드로 미는 (원코드)', degrees: [1], use: '드롭·댄스 브레이크' },
  ],
  minor: [
    { id: 'dark', name: '다크·걸크러시 (6415 단조형)', degrees: [1, 6, 3, 7], use: '다크·걸크러시 벌스와 후렴' },
    { id: 'sad', name: '슬프고 서정적인 (i–iv–VII–III)', degrees: [1, 4, 7, 3], use: '다크·청량·발라드 벌스와 후렴' },
    { id: 'epic', name: '웅장하게 터지는 (456)', degrees: [6, 7, 1, 1], use: '다크·청량 후렴 상승부, 프리코러스' },
    { id: 'rise_m', name: '터지기 직전 (4561 단조형)', degrees: [6, 7, 1, 3], use: '다크·청량 프리코러스' },
    { id: 'turn6345_m', name: '아련하게 도는 (6345 단조형)', degrees: [1, 5, 6, 7], use: '아련한 청량·다크 인트로와 후렴' },
    { id: 'loop6514_m', name: '강렬한 반복 (6514)', degrees: [1, 7, 3, 6], use: '다크·밴드 후렴과 프리' },
    { id: 'chorus4156_m', name: '나란한 장조로 트이는 (4156)', degrees: [6, 3, 7, 1], use: '다크 곡의 후렴' },
    { id: 'build', name: '한 계단씩 오르는 (iv–v–VI–VII)', degrees: [4, 5, 6, 7], use: '프리코러스' },
    { id: 'trap', name: '두 코드 반복 (i–VI)', degrees: [1, 6], use: '벌스 (근거 약함)' },
    { id: 'vamp_iv', name: '그루브 두 코드 (i–iv, 7th)', degrees: [1, 4], seventh: true, use: '다크 벌스·랩' },
    { id: 'view', name: '세련된 마이너 루프 (i–v–iv–v, 7th)', degrees: [1, 5, 4, 5], seventh: true, use: 'R&B·클럽 곡 전체 루프' },
    { id: 'bridge4236_m', name: '꺾어 트는 (4236 단조형, 7th)', degrees: [6, 4, 5, 1], seventh: true, use: '다크·R&B 브릿지' },
    { id: 'mystic', name: '마이너 루프 (i–VII–VI–VII, 힙합)', degrees: [1, 7, 6, 7], seventh: true, use: '힙합 벌스 (근거 약함)' },
    { id: 'descend', name: '내려가는 긴장감 (i–VII–VI–v)', degrees: [1, 7, 6, 5], use: '다크·클럽 후렴' },
    // 음계 밖 화음이 든 진행 (D-025): 화성단음계 V, 도리안 IV, 프리지안 ♭II
    { id: 'andalusian', name: '정열적으로 내려가는 (안달루시안 i–VII–VI–V)', degrees: [1, 7, 6, '5M'], use: '다크·클럽 후렴' },
    { id: 'harmonicV', name: '긴장 뒤에 풀리는 (i–iv–V7–i)', degrees: [1, 4, '5d7', 1], use: '다크·발라드 후렴 끝' },
    { id: 'circle_m', name: '한 바퀴 도는 (단조 순환, V7로 마침)', degrees: [1, 4, 7, 3, 6, 2, '5d7', 1], seventh: true, use: '단조 발라드·청량 후렴' },
    { id: 'dorian4', name: '밝게 비틀린 (i–VII–IV–VI, 도리안 IV)', degrees: [1, 7, '4M', 6], use: '다크·밴드 프리·후렴' },
    { id: 'phrygian', name: '이국적으로 흔들리는 (i–♭II)', degrees: [1, 'b2M'], use: '다크 후렴·드롭' },
    { id: 'drop', name: '한 코드로 미는 (원코드)', degrees: [1], use: '드롭·댄스 브레이크' },
  ],
};

export function findProgression(mode, degrees) {
  const key = degrees.join(',');
  return (PROGRESSIONS[mode] || []).find((p) => p.degrees.join(',') === key) || null;
}

// 빠르기를 말로
export function tempoWord(bpm) {
  if (bpm < 80) return '아주 느림 (발라드)';
  if (bpm < 100) return '느긋함 (R&B·미디엄)';
  if (bpm < 115) return '보통 (팝)';
  if (bpm < 130) return '신남 (댄스)';
  if (bpm < 150) return '빠름 (하우스·EDM)';
  return '아주 빠름 (저지 클럽·드럼앤베이스)';
}
