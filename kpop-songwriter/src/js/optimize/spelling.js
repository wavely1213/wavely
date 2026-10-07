// 맞춤법·띄어쓰기 점검: 플랫폼에 그대로 보이는 가사를 발매 전에 AI로 점검한다. 확실한 잘못만, 노래 말투는 그대로.
// 결과는 곡에 저장: song.spelling = { key, at, items: [{ id, line, fixed, why, ok }] }
import { getSample } from '../ai.js';
import { lyricLines, lyricsKey } from '../album/lyrics.js';
import { lineMatcher, checkStatus } from './linecheck.js';
import { uid } from '../dom.js';

export function spellingStatus(song) {
  return checkStatus(song.spelling, song);
}

// 지금 가사에 있는 줄만, 고친 줄이 원래 줄과 다른 것만
export function parseSpelling(res, song) {
  const match = lineMatcher(song, { exact: true });
  const seen = new Set();
  const items = (Array.isArray(res?.items) ? res.items : []).map((x) => {
    const line = match(x?.line);
    const fixed = String(x?.fixed ?? '').split('\n')[0].trim().slice(0, 160);
    if (!line || !fixed || fixed === line || seen.has(line)) return null;
    seen.add(line);
    return { id: uid(), line, fixed, why: String(x.why ?? '').slice(0, 120), ok: false };
  }).filter(Boolean).slice(0, 30);
  return { key: lyricsKey(song), at: Date.now(), items };
}

export async function checkSpelling(song, { signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const asked = { sections: song.sections.map((s) => ({ ...s })) }; // 요청할 때의 가사로 고정
  const lines = lyricLines(asked);
  if (!lines.length) throw { code: 'empty_completion' };
  const prompt = [
    '너는 음원 유통 가사 검수자다. 아래 K-pop 가사의 한국어 맞춤법·띄어쓰기에서 확실히 틀린 곳만 고친다.',
    '고치지 않을 것: 노래 말투·줄임말·구어(널, 있잖아, 몰라 등), 의도된 반복, 영어 문장, 대소문자, 문장부호, 괄호 애드립의 의성어. 뜻이나 음절 수를 바꾸지 않는다.',
    '틀린 곳이 없으면 items는 빈 배열.',
    `가사 (줄마다):\n${lines.map((l) => `- ${l}`).join('\n')}`,
    '출력은 JSON 하나만: {"items":[{"line":"가사의 그 줄 그대로","fixed":"고친 줄 전체","why":"무엇을 고쳤는지 짧게"}]}',
  ].join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  if (!res || typeof res !== 'object') throw { code: 'invalid_json' };
  return parseSpelling(res, asked);
}
