// 곡 길이 예상: 편곡의 섹션 마디 수 합 × 4박 × 60 / BPM (4/4박자). 요즘 K-pop은 대개 2분 30초~3분 30초.
// 앱 데모·MIDI 길이이고, Suno 결과 길이는 가사 양에 따라 달라질 수 있다. 기본 구조(120 BPM 약 2분 24초)에는 경고하지 않게 2분부터 짧다고 본다.
import { mmss } from '../timefmt.js';

export const SHORT = 120;
export const LONG = 240;

export function songLength(song, bpm = song.music.bpm) {
  const bars = song.sections.reduce((n, s) => n + (song.music.sections[s.id]?.bars || 0), 0);
  return { bars, seconds: bpm ? (bars * 4 * 60) / bpm : 0 };
}

export function lengthNote({ bars, seconds }) {
  if (!bars) return '';
  const base = `편곡 기준 길이 ${mmss(seconds)} (${bars}마디)`;
  if (seconds > LONG) return `${base} — 길어요. 요즘 K-pop은 대개 2분 30초~3분 30초예요. 반복 코러스·브릿지를 줄여 볼 만해요.`;
  if (seconds < SHORT) return `${base} — 짧아요. 숏폼용이 아니면 코러스를 한 번 더 넣거나 마디를 늘려 볼 만해요.`;
  return base;
}
