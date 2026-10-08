// 컨셉 아이디어: 아이디어가 없을 때 AI가 곡 컨셉 3개(제목·주제·스토리·분위기·키워드)를 제안한다.
// 취향 기록(발매 후 반응 좋은 곡 포함)과 지금 적어 둔 것이 있으면 그 방향으로.
import { getSample } from './ai.js';
import { MOODS, GROUP_TYPES } from './constants.js';
import { tasteBlock } from './learn/context.js';

export function parseConcepts(res) {
  const items = (Array.isArray(res?.concepts) ? res.concepts : []).map((c) => ({
    title: String(c?.title ?? '').trim().slice(0, 60),
    theme: String(c?.theme ?? '').trim().slice(0, 120),
    story: String(c?.story ?? '').trim().slice(0, 400),
    moods: (Array.isArray(c?.moods) ? c.moods : []).map(String).filter((m) => MOODS.includes(m)).slice(0, 3),
    keywords: (Array.isArray(c?.keywords) ? c.keywords.join(', ') : String(c?.keywords ?? '')).slice(0, 120),
    hook: String(c?.hook ?? '').trim().slice(0, 40),
  })).filter((c) => c.title && c.theme).slice(0, 3);
  if (!items.length) throw { code: 'invalid_json' };
  return items;
}

export async function suggestConcepts(song, { hint = '', signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const c = song.concept;
  const prompt = [
    '너는 K-pop A&R 디렉터다. 새 곡의 컨셉을 서로 확실히 다른 방향으로 3개 제안한다. 한국어로.',
    `그룹 형태: ${GROUP_TYPES[c.group] || c.group}. 분위기는 이 중에서만 1~3개: ${MOODS.join(', ')}.`,
    '좋은 컨셉: 한 문장으로 말할 수 있는 구체적 상황(누가·언제·무엇), 이미지가 떠오르는 키워드, 코러스에 쓸 짧은 영어 훅 하나. 흔한 "사랑해·보고 싶어"만으로 끝나지 않게. 실존 곡·가수 이름은 쓰지 않는다.',
    tasteBlock('lyrics'),
    hint ? `작곡가가 원하는 방향: ${hint}` : '',
    c.theme || c.story || c.keywords ? `지금 적어 둔 것(살려서 발전): 주제 ${c.theme} / 스토리 ${c.story} / 키워드 ${c.keywords}` : '',
    '출력은 JSON 하나만: {"concepts":[{"title":"곡 제목","theme":"주제 한 줄","story":"화자·상황 2~3문장","moods":["청량"],"keywords":["키워드"],"hook":"English hook"}]}',
  ].filter(Boolean).join('\n\n');
  return parseConcepts(await sample.json(prompt, { signal, cache: false }));
}
