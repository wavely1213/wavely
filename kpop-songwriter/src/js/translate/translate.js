// 다른 언어 버전(번안 가사): 섹션마다 줄 수와 부를 단위 수(음절·모라)를 원문에 맞춘 가사를 AI로 만든다.
// 곡에 저장: song.translations[lang] = { key, at, sections: { [sectionId]: [{ text, kana, count }] } }
import { getSample } from '../ai.js';
import { sectionLabels } from '../structure.js';
import { countSyllables } from '../lyrictools.js';
import { lyricsKey } from '../album/lyrics.js';
import { singCount, FIT_TOLERANCE } from './mora.js';

export const LANGS = {
  ja: { name: '일본어', unit: '음(모라)', suno: 'Japanese lyrics' },
  en: { name: '영어', unit: '음절', suno: 'English lyrics' },
};

const linesOf = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean);

// 번안할 섹션: 가사가 있는 섹션 (비운 반복 섹션은 앞 섹션 번안을 그대로 씀)
export function sourceSections(song) {
  const labels = sectionLabels(song.sections);
  return song.sections.map((s, i) => ({ id: s.id, label: labels[i], lines: linesOf(s.text) })).filter((s) => s.lines.length);
}

// 'none' | 'stale'(원문 가사가 바뀜) | 'ok'
export function translationStatus(song, lang) {
  const t = song.translations?.[lang];
  if (!t) return 'none';
  return t.key === lyricsKey(song) ? 'ok' : 'stale';
}

// AI 답을 검사: 원문 섹션 id만, 줄 수는 원문에 맞춰 자르고(모자라면 그대로), 부를 단위 수를 계산해 붙인다
export function parseTranslation(res, song, lang) {
  const src = new Map(sourceSections(song).map((s) => [s.id, s]));
  const sections = {};
  (Array.isArray(res?.sections) ? res.sections : []).forEach((x) => {
    const s = src.get(String(x?.id));
    if (!s || !Array.isArray(x.lines)) return;
    const lines = x.lines.slice(0, s.lines.length).map((l) => {
      const text = String(typeof l === 'string' ? l : l?.text ?? '').trim().slice(0, 200);
      const kana = lang === 'ja' ? String(l?.kana ?? '').trim().slice(0, 200) : '';
      return { text, kana, count: singCount(text, lang, kana) };
    }).filter((l) => l.text);
    if (lines.length) sections[s.id] = lines;
  });
  if (!Object.keys(sections).length) throw { code: 'invalid_json' };
  return { key: lyricsKey(song), at: Date.now(), sections };
}

// 원문 줄과 번안 줄을 나란히 + 맞는지
export function compareLines(song, lang) {
  const t = song.translations?.[lang];
  return sourceSections(song).map((s) => ({
    ...s,
    rows: s.lines.map((line, i) => {
      const tr = t?.sections?.[s.id]?.[i] || null;
      const want = countSyllables(line);
      return { line, want, tr, fit: tr ? Math.abs(tr.count - want) <= FIT_TOLERANCE : null };
    }),
  }));
}

// Suno에 넣을 곡 사본: 섹션 가사를 번안으로 바꾼다 (buildLyrics에 그대로 넘김).
// 번안이 빠진 섹션·줄은 원문을 그대로 둔다 (비워 두면 앞 섹션 번안으로 채워져 엉뚱한 가사가 됨)
export function translatedSong(song, lang) {
  const t = song.translations?.[lang];
  return { ...song, sections: song.sections.map((s) => {
    const src = linesOf(s.text);
    const tr = t?.sections?.[s.id] || [];
    return { ...s, text: src.map((line, i) => tr[i]?.text || line).join('\n') };
  }) };
}

export async function translateLyrics(song, lang, { signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const L = LANGS[lang];
  // 요청할 때의 가사로 고정 (기다리는 동안 원문을 고치면 결과는 '다시 번안'으로 보여야 함)
  const asked = { ...song, sections: song.sections.map((s) => ({ ...s })) };
  const src = sourceSections(asked).map((s) => ({
    id: s.id,
    이름: s.label,
    줄: s.lines.map((l) => ({ 원문: l, 음절수: countSyllables(l) })),
  }));
  const prompt = [
    `너는 K-pop 곡의 ${L.name} 버전을 쓰는 번안 작사가다. 같은 멜로디로 부를 수 있게 번안한다.`,
    `규칙: 섹션마다 원문과 줄 수를 같게. 각 줄의 ${L.unit} 수를 원문 음절수와 같게(±1까지). 직역보다 뜻·이미지·감정을 살린 자연스러운 ${L.name}.`,
    '원문의 영어 훅·영어 구절은 바꾸지 않고 그대로 둔다. (괄호) 애드립도 괄호째 번안하거나 그대로 둔다. 줄 끝 라임이 있으면 살린다.',
    lang === 'ja' ? '각 줄에 kana(전부 히라가나·가타카나로 쓴 읽기, 영어는 그대로)를 붙인다. 모라는 kana로 센다(작은 ゃゅょ는 앞 글자와 한 음, っ·ん·ー는 한 음).' : '',
    `곡: ${song.title} / 주제: ${song.concept.theme} / 분위기: ${song.concept.moods.join(', ')}`,
    `원문: ${JSON.stringify(src)}`,
    `출력은 JSON 하나만: {"sections":[{"id":"","lines":[${lang === 'ja' ? '{"text":"","kana":""}' : '{"text":""}'}]}]}`,
  ].filter(Boolean).join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  return parseTranslation(res, asked, lang);
}
