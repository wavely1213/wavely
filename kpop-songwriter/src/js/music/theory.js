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

// 도수(1~7) 코드의 구성음 MIDI (3옥타브 근처)
export function chordNotes(root, mode, degree, seventh = false) {
  const i = degree - 1;
  const idxs = seventh ? [i, i + 2, i + 4, i + 6] : [i, i + 2, i + 4];
  return idxs.map((x) => degreeToMidi(root, mode, x, 48));
}

export function chordName(root, mode, degree, seventh = false) {
  const n = chordNotes(root, mode, degree, seventh);
  const third = n[1] - n[0];
  const fifth = n[2] - n[0];
  let q = third === 3 ? (fifth === 6 ? 'dim' : 'm') : '';
  if (seventh) {
    const sev = n[3] - n[0];
    if (q === '') q = sev === 11 ? 'maj7' : '7';
    else if (q === 'm') q = 'm7';
    else q = 'm7b5';
  }
  return NOTE_NAMES[n[0] % 12] + q;
}

export function keyName(root, mode) {
  return `${NOTE_NAMES[root]} ${mode === 'minor' ? 'minor' : 'major'}`;
}

// 느낌 이름으로 고르는 코드 진행 (마디당 코드 1개, 마디 수만큼 반복)
export const PROGRESSIONS = {
  major: [
    { id: 'hope', name: '희망차고 밝은', degrees: [1, 5, 6, 4] },
    { id: 'emotional', name: '애절하고 감성적인', degrees: [6, 4, 1, 5] },
    { id: 'royal', name: '두근두근 고조 (K-pop 단골)', degrees: [4, 5, 3, 6] },
    { id: 'dreamy', name: '몽환·R&B', degrees: [2, 5, 1, 6], seventh: true },
    { id: 'build', name: '빌드업 (프리코러스용)', degrees: [2, 3, 4, 5] },
    { id: 'ballad', name: '발라드 (8마디)', degrees: [1, 5, 6, 3, 4, 1, 4, 5] },
    { id: 'simple', name: '단순 반복 (두 코드)', degrees: [1, 4] },
    { id: 'citypop', name: '시티팝 (세련된 7th)', degrees: [4, 3, 6, 1], seventh: true },
  ],
  minor: [
    { id: 'dark', name: '다크·걸크러시', degrees: [1, 6, 3, 7] },
    { id: 'sad', name: '슬프고 서정적인', degrees: [1, 4, 7, 3] },
    { id: 'epic', name: '웅장하게 터지는', degrees: [6, 7, 1, 1] },
    { id: 'build', name: '빌드업 (프리코러스용)', degrees: [4, 5, 6, 7] },
    { id: 'trap', name: '미니멀 반복 (힙합·트랩)', degrees: [1, 6] },
    { id: 'mystic', name: '몽환·미스터리', degrees: [1, 7, 6, 7], seventh: true },
    { id: 'descend', name: '내려가는 긴장감 (안달루시안)', degrees: [1, 7, 6, 5] },
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
