// 한 줄만 다시 쓰기: 섹션의 한 줄을 음절 수·줄 끝 라임을 맞춘 다른 후보 3개로 (나머지 가사는 그대로).
import { getSample, songBrief, LYRIC_RULES } from './ai.js';
import { tasteBlock } from './learn/context.js';
import { countSyllables } from './lyrictools.js';

export async function rewriteLine(song, sectionId, index, { request = '', signal } = {}) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const sec = song.sections.find((s) => s.id === sectionId);
  const lines = (sec?.text || '').split('\n');
  const line = (lines[index] || '').trim();
  if (!line) return [];
  const prompt = [
    '너는 K-pop 전문 작사가다. 섹션의 한 줄만 다르게 바꾼 후보 3개를 쓴다. 나머지 줄은 그대로 둔다.',
    LYRIC_RULES.replace('{EN}', String(100 - song.concept.koRatio)),
    tasteBlock('lyrics'),
    `바꿀 줄: ${JSON.stringify(line)} (${countSyllables(line)}음절)`,
    `바로 앞 줄: ${JSON.stringify((lines[index - 1] || '').trim())} / 바로 뒤 줄: ${JSON.stringify((lines[index + 1] || '').trim())}`,
    '조건: 음절 수는 원래 줄과 ±2 안, 줄 끝 라임(끝 모음)은 되도록 유지, 셋은 서로 다른 방향(이미지·감정·말맛), 섹션 흐름에 자연스럽게.',
    request ? `작곡가의 추가 요청: ${request}` : '',
    `곡 정보(JSON):\n${JSON.stringify(songBrief(song), null, 1)}`,
    '출력은 JSON 하나만: {"lines":["후보 1","후보 2","후보 3"]}',
  ].filter(Boolean).join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  const seen = new Set([line]);
  return (Array.isArray(res?.lines) ? res.lines : [])
    .map((l) => String(l).replace(/\s*\n\s*/g, ' ').trim())
    .filter((l) => l && !seen.has(l) && seen.add(l))
    .slice(0, 3);
}
