// 번안 초안: 원곡 가사(일본어 등)를 같은 멜로디로 부를 한국어 가사로. 줄 수는 원곡과 같게, 음절 수는 원곡 음 수에 맞춘다.
// translate/translate.js(한국어 → 다른 언어)의 반대 방향. AI 초안을 쓰면 곡의 remake.aiUsed를 켠다 (점검표가 AI 허락을 확인). 결정: D-026.
import { getSample } from '../ai.js';
import { sectionLabels } from '../structure.js';
import { ORIGINAL_LANGS, originalLine } from './model.js';

const KANA = /[ぁ-ゖァ-ヺ]/; // 읽기 칸에 가나가 하나도 없으면 버린다

// 번안할 섹션: 원곡 가사가 있고 한국어 가사가 빈 섹션. 앞의 같은 종류 섹션과 원곡 가사가 똑같으면(반복 후렴)
// 비워 둔 채로 둔다 — 가사지·Suno 가사에선 앞 섹션 가사로 채워진다
export function adaptTargets(song) {
  const ol = song.remake?.originalLyrics?.sections || {};
  const labels = sectionLabels(song.sections);
  const seen = [];
  const out = [];
  song.sections.forEach((s, i) => {
    const orig = ol[s.id];
    if (!orig?.length) return;
    const body = `${s.type}\n${orig.map((l) => l.text).join('\n')}`;
    const repeat = seen.includes(body);
    seen.push(body);
    if (!s.text.trim() && !repeat) out.push({ id: s.id, label: labels[i], orig });
  });
  return out;
}

// AI 답 검사: 요청한 섹션 id만, 줄 수는 원곡에 맞춰 자른다. kana는 원곡 줄의 비어 있는 읽기를 채우는 데만 쓴다
export function parseAdapt(res, targets, lang) {
  const want = new Map(targets.map((t) => [t.id, t]));
  const sections = {};
  (Array.isArray(res?.sections) ? res.sections : []).forEach((x) => {
    const t = want.get(String(x?.id));
    if (!t || !Array.isArray(x.lines)) return;
    const lines = x.lines.slice(0, t.orig.length).map((l) => ({
      ko: String(typeof l === 'string' ? l : l?.ko ?? l?.text ?? '').trim().slice(0, 200),
      kana: lang === 'ja' && typeof l === 'object' && KANA.test(String(l?.kana ?? '')) ? String(l.kana).trim().slice(0, 200) : '',
    }));
    if (lines.some((l) => l.ko)) sections[t.id] = lines;
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
      sec.text = lines.map((l) => l.ko).filter(Boolean).join('\n');
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
  const targets = adaptTargets(song);
  if (!targets.length) throw { code: 'nothing_empty' };
  const src = targets.map((t) => ({
    id: t.id,
    이름: t.label,
    줄: t.orig.map((l) => ({ 원곡: l.text, ...(lang === 'ja' ? { kana: l.kana || '(비어 있음)' } : {}), 음수: l.count })),
  }));
  const prompt = [
    `너는 ${ORIGINAL_LANGS[lang] || '외국어'} 원곡을 한국어 가사로 옮기는 K-pop 개사 작가다. 원곡 멜로디에 그대로 부를 수 있는 한국어 가사를 쓴다.`,
    '규칙: 섹션마다 원곡과 줄 수를 같게. 각 줄의 한국어 음절 수를 원곡 줄의 음수와 같게(±1까지). 직역보다 뜻·이미지·감정을 살린 자연스러운 한국어로, 번역투는 피한다.',
    '원곡의 영어 구절·영어 훅은 그대로 둔다. 길게 끄는 줄 끝에는 받침 없는 열린 소리(아·오·이 등)를 우선하고, 원곡의 줄 끝 라임이 있으면 살린다. 원곡 가사를 그대로 옮겨 적지 않는다.',
    lang === 'ja' ? '원곡 줄의 kana가 비어 있으면 그 줄의 읽기(전부 히라가나·가타카나, 영어는 그대로)를 kana에 적는다. 음수가 0인 줄(한자만 있어 아직 못 센 줄)은 kana 읽기로 모라를 세어 맞춘다.' : '',
    `곡: ${song.title} / 원곡: ${r.original.title} — ${r.original.artist} / 주제: ${song.concept.theme} / 분위기: ${song.concept.moods.join(', ')}`,
    `원곡: ${JSON.stringify(src)}`,
    `출력은 JSON 하나만: {"sections":[{"id":"","lines":[${lang === 'ja' ? '{"ko":"","kana":""}' : '{"ko":""}'}]}]}`,
  ].filter(Boolean).join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  return parseAdapt(res, targets, lang);
}
