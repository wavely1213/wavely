// 줄 단위 AI 점검(유사 표현·맞춤법)의 공통 부분: AI가 짚은 줄을 지금 가사의 실제 줄에 맞추기, 상태, 줄 바꾸기.
import { lyricLines, lyricsKey } from '../album/lyrics.js';

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

// AI가 적은 줄 → 가사의 실제 줄 (띄어쓰기·대소문자 무시, 4글자 넘으면 일부만 맞아도). 못 찾으면 null
export function lineMatcher(song) {
  const lines = lyricLines(song);
  const byNorm = new Map(lines.map((l) => [norm(l), l]));
  return (text) => byNorm.get(norm(text)) || lines.find((l) => norm(text).length > 3 && norm(l).includes(norm(text))) || null;
}

// 결과 { key, items: [{ ok }] } → 'none' 안 함 | 'stale' 점검 뒤 가사가 바뀜 | 'flagged' 확인할 줄 남음 | 'clear'
export function checkStatus(result, song) {
  if (!result) return 'none';
  if (result.key !== lyricsKey(song)) return 'stale';
  return result.items.some((i) => !i.ok) ? 'flagged' : 'clear';
}

// 섹션 가사에서 그 줄을 새 줄로 바꾼다 (같은 줄이 있는 섹션 전부, 줄 단위로 정확히 같은 것만). 바꾼 줄 수
export function replaceLine(song, line, next) {
  let n = 0;
  song.sections.forEach((s) => {
    const rows = s.text.split('\n');
    const out = rows.map((r) => (r.trim() === line ? (n++, r.replace(line, () => next)) : r)); // 함수로 넘겨 $& 등이 풀리지 않게
    if (out.some((r, i) => r !== rows[i])) s.text = out.join('\n');
  });
  return n;
}
