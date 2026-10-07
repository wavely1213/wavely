// 같은 멜로디 맞추기: 두 번째 벌스·프리코러스 등은 보통 첫 번째와 같은 멜로디로 부르므로,
// 줄 수와 줄마다 음절 수(애드립 제외)가 첫 번째와 비슷해야 부르기 쉽다. 2음절 넘게 다른 줄을 짚는다.
import { countSyllables } from './lyrictools.js';

const SKIP = ['Intro', 'Outro', 'Dance Break', 'Bridge'];
export const MATCH_TOLERANCE = 2;

// 애드립만 있는 줄((oh-oh) 등)은 멜로디 줄로 치지 않는다
const rowsOf = (text) => text.split('\n').map(countSyllables).filter((n) => n > 0);

// sections[index]가 앞의 같은 종류(가사 있는) 섹션과 맞는지. 반환: null(비교할 것 없음) 또는
// { ref(앞 섹션 index), lines: [{ n(1부터), have, want }], countHave, countWant }
export function matchFirst(sections, index, text = sections[index].text) {
  const s = sections[index];
  if (SKIP.includes(s.type) || !text.trim()) return null;
  const ref = sections.findIndex((p, i) => i < index && p.type === s.type && p.text.trim());
  if (ref < 0) return null;
  const want = rowsOf(sections[ref].text);
  const have = rowsOf(text);
  if (!want.length || !have.length) return null;
  const lines = have.map((n, i) => ({ n: i + 1, have: n, want: want[i] }))
    .filter((x) => x.want != null && Math.abs(x.have - x.want) > MATCH_TOLERANCE);
  return { ref, lines, countHave: have.length, countWant: want.length };
}

// 화면에 보일 한 줄 안내 (맞으면 '')
export function matchNote(m, refLabel) {
  if (!m) return '';
  const parts = [];
  if (m.countHave !== m.countWant) parts.push(`줄 수 ${m.countHave}줄 (${refLabel} ${m.countWant}줄)`);
  if (m.lines.length) parts.push(m.lines.slice(0, 4).map((x) => `${x.n}번째 줄 ${x.have}음절(${x.want})`).join(', ') + (m.lines.length > 4 ? ` 외 ${m.lines.length - 4}줄` : ''));
  return parts.length ? `${refLabel}의 멜로디로 부르려면 맞춰 보세요: ${parts.join(' · ')}` : '';
}
