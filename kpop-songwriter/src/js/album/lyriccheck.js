// 가사·음원 일치 확인: Suno는 가사 줄을 빼먹거나 바꿔 부르기도 한다. 플랫폼 가사(싱크 포함)는 실제로 부른 대로여야 하므로
// 완성곡을 들으며 줄마다 "맞게 불렀음"을 표시해 둔다. 가사가 바뀌면 다시 확인해야 한다.
import { lyricLines, lyricsKey } from './lyrics.js';

// song.lyricCheck = { key: 가사 열쇠, ok: [맞게 부른 줄 번호], off: [다르게 부른 줄 번호] }
export function lyricCheckStatus(song) {
  const lines = lyricLines(song);
  if (!lines.length) return 'empty';
  const c = song.lyricCheck;
  if (!c || (!c.ok?.length && !c.off?.length)) return 'none';
  if (c.key !== lyricsKey(song)) return 'stale';
  if (c.off?.length) return 'off';
  return c.ok.length >= lines.length ? 'done' : 'partial';
}

// 줄 i를 '맞음' → '다름' → 표시 없음 순서로 돌린다 (가사가 바뀌었으면 처음부터)
export function cycleLine(song, i) {
  const key = lyricsKey(song);
  const c = song.lyricCheck?.key === key ? song.lyricCheck : { key, ok: [], off: [] };
  const ok = new Set(c.ok);
  const off = new Set(c.off);
  if (ok.has(i)) { ok.delete(i); off.add(i); } else if (off.has(i)) off.delete(i); else ok.add(i);
  song.lyricCheck = { key, ok: [...ok].sort((a, b) => a - b), off: [...off].sort((a, b) => a - b) };
}

export function markAll(song) {
  song.lyricCheck = { key: lyricsKey(song), ok: lyricLines(song).map((_, i) => i), off: [] };
}
