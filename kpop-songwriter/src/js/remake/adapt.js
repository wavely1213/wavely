// 번안 초안: 원곡 가사(일본어 등)를 같은 멜로디로 부를 한국어 가사로. 줄 수는 원곡과 같게, 음절 수는 원곡 음 수에 맞춘다.
// translate/translate.js(한국어 → 다른 언어)의 반대 방향. AI 초안을 쓰면 곡의 remake.aiUsed를 켠다 (점검표가 AI 허락을 확인). 결정: D-026.
import { getSample } from '../ai.js';
import { sectionLabels } from '../structure.js';
import { ORIGINAL_LANGS, COUNTED_LANGS, originalLine } from './model.js';

const KANA = /[ぁ-ゖァ-ヺ]/;
const HAN = /\p{Script=Han}/u;
// 읽기로 받는 것: 가나가 있고 한자가 없는 것 (한자가 남은 읽기는 음 수를 셀 수 없다)
const isReading = (k) => KANA.test(k) && !HAN.test(k);

// 번안할 섹션: 원곡 가사가 있고 한국어 가사가 빈 섹션. 바로 앞의 같은 종류 섹션과 원곡 가사가 똑같으면(반복 후렴)
// 비워 둔 채로 둔다 — 가사지·Suno 가사에선 앞 섹션 가사로 채워진다 (album/lyrics.js plainLyrics, model.js koreanLines와 같은 규칙).
// 사이에 원곡이 다른 같은 종류 섹션이 있으면(サビA·サビB·大サビA) 비워 두면 다른 후렴 가사가 들어가므로 따로 쓴다
export function adaptTargets(song) {
  const ol = song.remake?.originalLyrics?.sections || {};
  const labels = sectionLabels(song.sections);
  const text = (id) => (ol[id] || []).map((l) => l.text).join('\n');
  const out = [];
  song.sections.forEach((s, i) => {
    const orig = ol[s.id];
    if (!orig?.length || s.text.trim()) return;
    const prev = song.sections.slice(0, i).reverse().find((p) => p.type === s.type);
    if (prev && text(prev.id) === text(s.id)) return;
    out.push({ id: s.id, label: labels[i], orig });
  });
  return out;
}

// AI 답 검사: 요청한 섹션 id만, 줄 수는 원곡에 맞춰 자른다. 중간에 빈 줄이 있는 섹션은 버린다(뒤 줄이 원곡과 어긋남).
// kana는 원곡 줄의 비어 있는 읽기를 채우는 데만 쓴다
export function parseAdapt(res, targets, lang) {
  const want = new Map(targets.map((t) => [t.id, t]));
  const sections = {};
  (Array.isArray(res?.sections) ? res.sections : []).forEach((x) => {
    const t = want.get(String(x?.id));
    if (!t || !Array.isArray(x.lines)) return;
    const lines = x.lines.slice(0, t.orig.length).map((l) => {
      const kana = lang === 'ja' && l && typeof l === 'object' ? String(l.kana ?? '').trim().slice(0, 200) : '';
      return { ko: String(typeof l === 'string' ? l : l?.ko ?? l?.text ?? '').trim().slice(0, 200), kana: isReading(kana) ? kana : '' };
    });
    const last = lines.map((l) => !!l.ko).lastIndexOf(true);
    if (last < 0 || lines.slice(0, last).some((l) => !l.ko)) return;
    sections[t.id] = lines.slice(0, last + 1);
  });
  if (!Object.keys(sections).length) throw { code: 'invalid_json' };
  return sections;
}

// 결과를 곡에 넣는다: 그사이 사용자가 한국어 가사를 쓴 섹션은 건드리지 않는다. 반환: 채운 섹션 수
export function applyAdapt(song, sections) {
  const r = song.remake;
  const lang = r.original.language;
  let n = 0;
  Object.entries(sections).forEach(([id, lines]) => {
    const sec = song.sections.find((s) => s.id === id);
    const orig = r.originalLyrics.sections[id];
    if (!sec || !orig) return;
    if (!sec.text.trim()) {
      sec.text = lines.map((l) => l.ko).join('\n');
      if (sec.text) n += 1;
    }
    if (lang === 'ja') r.originalLyrics.sections[id] = orig.map((o, j) => (o.kana || !lines[j]?.kana ? o : originalLine(o.text, lines[j].kana, lang)));
  });
  if (n) r.aiUsed = true;
  return n;
}

export async function adaptToKorean(song, { signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const r = song.remake;
  const lang = r.original.language;
  const counted = COUNTED_LANGS.includes(lang);
  const targets = adaptTargets(song);
  if (!targets.length) throw { code: 'nothing_to_adapt' };
  // 음수 '?': 읽기 없는 한자 줄 — 원곡 줄의 count는 가나만 세서 실제보다 작다. AI가 읽기를 먼저 적고 그 모라로 맞춘다
  const src = targets.map((t) => ({
    id: t.id,
    이름: t.label,
    줄: t.orig.map((l) => ({ 원곡: l.text, ...(lang === 'ja' ? { kana: l.kana || '(비어 있음)' } : {}), ...(counted ? { 음수: l.count ?? '?' } : {}) })),
  }));
  const prompt = [
    lang === 'ko'
      ? '너는 원곡 가사를 새 한국어 가사로 고쳐 쓰는 K-pop 개사 작가다. 원곡 멜로디에 그대로 부를 수 있는 새 가사를 쓴다.'
      : `너는 ${ORIGINAL_LANGS[lang] || '외국어'} 원곡을 한국어 가사로 옮기는 K-pop 개사 작가다. 원곡 멜로디에 그대로 부를 수 있는 한국어 가사를 쓴다.`,
    counted
      ? '규칙: 섹션마다 원곡과 줄 수를 같게, 줄마다 빈 줄 없이. 각 줄의 한국어 음절 수를 원곡 줄의 음수와 같게(±1까지). 직역보다 뜻·이미지·감정을 살린 자연스러운 한국어로, 번역투는 피한다.'
      : '규칙: 섹션마다 원곡과 줄 수를 같게, 줄마다 빈 줄 없이. 각 줄은 원곡 줄을 부르는 길이에 맞춘다. 직역보다 뜻·이미지·감정을 살린 자연스러운 한국어로, 번역투는 피한다.',
    '원곡의 영어 구절·영어 훅은 그대로 둔다. 길게 끄는 줄 끝에는 받침 없는 열린 소리(아·오·이 등)를 우선하고, 원곡의 줄 끝 라임이 있으면 살린다. 원곡 가사를 그대로 옮겨 적지 않는다.',
    lang === 'ja' ? "원곡 줄의 kana가 비어 있으면 그 줄의 읽기(한자 없이 전부 히라가나·가타카나, 영어는 그대로)를 kana에 적는다. 음수가 '?'인 줄(읽기 없는 한자 줄)은 먼저 읽기를 적고, 그 읽기의 모라 수(작은 ゃゅょ는 앞 글자와 한 음, っ·ん·ー는 한 음)에 한국어 음절 수를 맞춘다." : '',
    `곡: ${song.title} / 원곡: ${r.original.title} — ${r.original.artist} / 주제: ${song.concept.theme} / 분위기: ${song.concept.moods.join(', ')}`,
    `원곡: ${JSON.stringify(src)}`,
    `출력은 JSON 하나만: {"sections":[{"id":"","lines":[${lang === 'ja' ? '{"ko":"","kana":""}' : '{"ko":""}'}]}]}`,
  ].filter(Boolean).join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  return parseAdapt(res, targets, lang);
}
