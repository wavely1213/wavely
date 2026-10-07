// 보컬 음역: 멤버마다 부를 수 있는 높이를 정하고, 멜로디가 그 안에 있는지 본다.
import { degreeToMidi, NOTE_NAMES } from './theory.js';

// MIDI 번호 범위 (C4 = 60). 일반적인 대중가요 보컬 음역을 넉넉히 잡은 어림값.
export const VOICE_RANGES = {
  'f-high': { name: '여성 고음', low: 60, high: 81 },
  'f-mid': { name: '여성 중음', low: 57, high: 77 },
  'f-low': { name: '여성 저음', low: 53, high: 72 },
  'm-high': { name: '남성 고음', low: 50, high: 71 },
  'm-mid': { name: '남성 중음', low: 45, high: 67 },
  'm-low': { name: '남성 저음', low: 40, high: 62 },
  rap: { name: '랩 (음역 무관)', low: null, high: null },
};

export function defaultVoice(group, position = '') {
  if (/래퍼/.test(position)) return 'rap';
  return group === 'boy' || group === 'solo_m' ? 'm-mid' : 'f-mid';
}

export function midiName(n) {
  return `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`;
}

// 섹션을 맡은 멤버들이 함께 부를 수 있는 범위 (겹치는 부분). 멤버가 없거나 랩뿐이면 null.
export function sectionRange(song, section) {
  const ms = section.members.map((id) => song.members.find((m) => m.id === id)).filter(Boolean);
  const ranges = ms.map((m) => VOICE_RANGES[m.voice || defaultVoice(song.concept.group, m.position)]).filter((r) => r && r.low != null);
  if (!ranges.length) return null;
  const low = Math.max(...ranges.map((r) => r.low));
  const high = Math.min(...ranges.map((r) => r.high));
  const names = [...new Set(ms.map((m) => m.name).filter(Boolean))];
  // 멤버 음역이 서로 겹치지 않으면 가장 넓게 잡고 경고한다
  if (low > high) return { low: Math.min(...ranges.map((r) => r.low)), high: Math.max(...ranges.map((r) => r.high)), names, conflict: true };
  return { low, high, names, conflict: false };
}

// 스케일 인덱스(d) 범위로 바꾼다 (AI 멜로디 요청용)
export function degreeRange(root, mode, range) {
  let lo = null;
  let hi = null;
  for (let d = -14; d <= 21; d++) {
    const m = degreeToMidi(root, mode, d);
    if (m >= range.low && m <= range.high) { if (lo == null) lo = d; hi = d; }
  }
  return lo == null ? null : { lo, hi };
}

// 음역 밖 음표의 번호들
export function outOfRange(notes, root, mode, range) {
  if (!range) return [];
  return notes.map((n, i) => ({ i, m: degreeToMidi(root, mode, n.d) })).filter(({ m }) => m < range.low || m > range.high).map(({ i }) => i);
}

// 음역 밖 음표를 옥타브씩 옮겨 넣는다 (가락 모양은 유지). 옮겨도 안 들어가면 그대로 둔다.
export function foldIntoRange(notes, root, mode, range) {
  if (!range) return notes;
  return notes.map((n) => {
    let d = n.d;
    for (let k = 0; k < 4 && degreeToMidi(root, mode, d) > range.high; k++) d -= 7;
    for (let k = 0; k < 4 && degreeToMidi(root, mode, d) < range.low; k++) d += 7;
    const m = degreeToMidi(root, mode, d);
    return m >= range.low && m <= range.high ? { ...n, d } : n;
  });
}
