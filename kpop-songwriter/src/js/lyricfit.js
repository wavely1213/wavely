// 가사·마디 맞춤: 섹션 가사가 편곡 마디 수(4/4박자)에 들어가는지 초당 음절 수로 본다. 애드립 (괄호)는 뺀다.
// 노래는 초당 6음절, 랩은 8음절을 넘으면 빠듯함. 벌스·코러스 등 가사 섹션이 초당 0.8음절보다 적으면 느슨함
// (일부러 길게 끄는 곳일 수 있어 안내만). 그 사이는 아무것도 보이지 않는다.
import { countSyllables } from './lyrictools.js';

export const TIGHT_SING = 6;
export const TIGHT_RAP = 8;
export const LOOSE = 0.8;
const LOOSE_TYPES = ['Verse', 'Pre-Chorus', 'Chorus', 'Rap', 'Bridge', 'Hook'];

// 반환: null(가사 없음·마디 정보 없음) 또는 { level: 'ok'|'tight'|'loose', syl, seconds, perSec, label, tip }
export function lyricFit(text, { bars, bpm, type }) {
  if (!bars || !bpm) return null;
  const syl = String(text || '').split('\n').reduce((n, l) => n + countSyllables(l), 0);
  if (!syl) return null;
  const seconds = (bars * 4 * 60) / bpm;
  const perSec = syl / seconds;
  const max = type === 'Rap' ? TIGHT_RAP : TIGHT_SING;
  const level = perSec > max ? 'tight' : perSec < LOOSE && LOOSE_TYPES.includes(type) ? 'loose' : 'ok';
  const rate = perSec.toFixed(1);
  const label = level === 'tight' ? `빠듯해요 · 초당 ${rate}음절` : level === 'loose' ? `느슨해요 · 초당 ${rate}음절` : `초당 ${rate}음절`;
  const where = `${bars}마디(${seconds.toFixed(1)}초)에 ${syl}음절`;
  const tip = level === 'tight'
    ? `${where} — 부르기 빠듯해요. 줄이거나, 편곡 탭에서 이 섹션 마디를 늘려 보세요.`
    : level === 'loose'
      ? `${where} — 가사가 적어 늘어질 수 있어요. 길게 끄는 부분이 아니면 줄을 더하거나 마디를 줄여 보세요.`
      : `${where}.`;
  return { level, syl, seconds, perSec, label, tip };
}
