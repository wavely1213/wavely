// 채점 기준 보정: 기본 줄 길이 범위(K-pop 어림값)를, 작곡가가 좋아하거나 직접 고친 가사의 줄 길이로 조금씩 옮긴다.
// 자료가 적을 때는 기본값을 거의 그대로 쓰고(PRIOR줄만큼의 무게), 쌓일수록 내 가사 쪽으로 간다.
import { countSyllables } from '../lyrictools.js';

// 섹션 종류별 한 줄 음절 수 권장 범위 (기본값)
export const DEFAULT_SYLLABLES = {
  Chorus: [5, 11], Hook: [4, 10], 'Post-Chorus': [3, 10], 'Pre-Chorus': [6, 12],
  Verse: [7, 13], Bridge: [6, 13], Rap: [9, 18],
};
export const FALLBACK_SYLLABLES = [6, 13];
const PRIOR = 16; // 기본값의 무게 (줄 수)
export const MIN_LINES = 8; // 이보다 적으면 보정하지 않음

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

// 취향 기록에서 보정에 쓸 가사: 👍한 AI 가사·♥한 줄, 직접 고친 뒤의 가사 (섹션 종류를 아는 것만)
export function lyricSamples(taste) {
  return (taste?.log || [])
    .filter((e) => e.kind === 'lyrics' && e.context?.section && ((e.rating === 1 && e.text) || (e.rating === 0 && e.after)))
    .map((e) => ({ type: e.context.section, text: e.rating === 0 ? e.after : e.text }));
}

// 반환: { [섹션 종류]: { range: [lo, hi], n(줄 수), own: [내 가사 10%, 90%] } } — 보정한 종류만
export function syllableRanges(taste) {
  const by = {};
  lyricSamples(taste).forEach(({ type, text }) => {
    text.split('\n').map((l) => l.trim()).filter((l) => l && !/^\[.*\]$/.test(l)).forEach((l) => {
      const n = countSyllables(l);
      if (n > 0) (by[type] = by[type] || []).push(n);
    });
  });
  const out = {};
  Object.entries(by).forEach(([type, xs]) => {
    if (xs.length < MIN_LINES) return;
    const sorted = [...xs].sort((a, b) => a - b);
    const own = [quantile(sorted, 0.1), quantile(sorted, 0.9)];
    const def = DEFAULT_SYLLABLES[type] || FALLBACK_SYLLABLES;
    const w = xs.length / (xs.length + PRIOR);
    const lo = Math.max(2, Math.round(def[0] * (1 - w) + own[0] * w));
    const hi = Math.max(lo + 3, Math.round(def[1] * (1 - w) + own[1] * w));
    out[type] = { range: [lo, hi], n: xs.length, own };
  });
  return out;
}

// 같은 기록으로 여러 번 계산하지 않게 (기록 수·마지막 기록이 같으면 그대로)
let cache = { key: '', value: {} };
export function cachedRanges(taste) {
  const log = taste?.log || [];
  const key = taste?.enabled === false ? 'off' : `${log.length}:${log[log.length - 1]?.id || ''}`;
  if (key !== cache.key) cache = { key, value: key === 'off' ? {} : syllableRanges(taste) };
  return cache.value;
}
