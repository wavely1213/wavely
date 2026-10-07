// 싱크 가사(LRC): 마스터를 들으며 줄마다 시작 시각을 찍어 스트리밍 싱크 가사 파일을 만든다.
// 곡에 저장하는 형식: song.sync = { key, lines: [{ text, t }], duration, master, at }
//   key = 맞출 때의 가사(줄 목록). 가사를 고치면 key가 달라져 "다시 맞추기"로 안내한다.
import { plainLyrics } from './lyrics.js';

// 맞출 줄: 태그 없는 가사지의 빈 줄을 뺀 줄들 (비운 반복 섹션은 앞 섹션 가사로 채워짐)
export function syncLines(song) {
  return plainLyrics(song).split('\n').map((l) => l.trim()).filter(Boolean);
}

export function lyricsKey(song) {
  return syncLines(song).join('\n');
}

// 'none' 아직 없음 | 'stale' 가사가 바뀜 | 'partial' 덜 찍음 | 'order' 시각 순서가 꼬임 | 'ok'
export function syncStatus(song) {
  const s = song.sync;
  if (!s?.lines?.length) return 'none';
  if (s.key !== lyricsKey(song)) return 'stale';
  if (s.lines.some((l) => !Number.isFinite(l.t))) return 'partial';
  if (s.lines.some((l, i) => i && l.t < s.lines[i - 1].t)) return 'order';
  return 'ok';
}

export const SYNC_LABEL = { none: '싱크 없음', stale: '가사가 바뀜 — 다시 맞추기', partial: '덜 맞춤', order: '시각 순서 확인', ok: '싱크 완료' };

const pad = (n) => String(n).padStart(2, '0');

// 초 → mm:ss.xx (LRC 표준, 100분의 1초)
export function lrcTime(sec) {
  const cs = Math.max(0, Math.round((Number(sec) || 0) * 100));
  return `${pad(Math.floor(cs / 6000))}:${pad(Math.floor((cs % 6000) / 100))}.${pad(cs % 100)}`;
}

// 찍은 시각 배열(null 허용)을 곡에 저장할 형식으로
export function makeSync(song, times, { duration = null, master = '' } = {}) {
  const lines = syncLines(song).map((text, i) => ({ text, t: Number.isFinite(times[i]) ? Math.round(times[i] * 100) / 100 : null }));
  return { key: lyricsKey(song), lines, duration, master, at: Date.now() };
}

// 전체를 sec초 당기거나(-) 미룸(+). 0초 아래로는 안 감
export function shiftTimes(times, sec) {
  return times.map((t) => (Number.isFinite(t) ? Math.max(0, Math.round((t + sec) * 100) / 100) : t));
}

// 한 줄만 조금 옮김. 앞뒤 줄 시각을 넘지 않게 막는다
export function nudgeTime(times, i, sec) {
  if (!Number.isFinite(times[i])) return times;
  const prev = times.slice(0, i).reverse().find(Number.isFinite) ?? 0;
  const next = times.slice(i + 1).find(Number.isFinite) ?? Infinity;
  const out = [...times];
  out[i] = Math.round(Math.min(next, Math.max(prev, times[i] + sec)) * 100) / 100;
  return out;
}

export function toLrc({ title = '', artist = '', album = '', lines, duration = null }) {
  const head = [
    title && `[ti:${title}]`,
    artist && `[ar:${artist}]`,
    album && `[al:${album}]`,
    Number.isFinite(duration) && `[length:${lrcTime(duration).slice(0, 5)}]`,
  ].filter(Boolean);
  const body = lines.filter((l) => Number.isFinite(l.t)).map((l) => `[${lrcTime(l.t)}]${l.text}`);
  return `${[...head, ...body].join('\n')}\n`;
}
