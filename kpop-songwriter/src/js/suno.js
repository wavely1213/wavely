// Suno Custom 모드에 붙여넣을 텍스트를 만든다.
import { sectionLabels } from './structure.js';
import { INSTRUMENT_BY_ID } from './music/instruments.js';

const ENERGY_WORD = ['', 'minimal, quiet', 'laid-back', 'building', 'energetic', 'explosive, full'];

// 편곡 탭 내용을 섹션 태그 힌트로 (Suno는 [ ] 안의 지시를 참고한다)
function arrangeHint(song, section) {
  const sm = song.music?.sections?.[section.id];
  if (!sm) return '';
  const inst = sm.instruments.map((i) => INSTRUMENT_BY_ID[i]?.suno).filter(Boolean).slice(0, 3);
  return [ENERGY_WORD[sm.energy], ...inst].filter(Boolean).join(', ');
}

function memberTag(section, members) {
  const ms = section.members.map((id) => members.find((m) => m.id === id)).filter(Boolean);
  if (!ms.length) return '';
  if (ms.length === members.length && members.length > 1) return 'group vocals';
  return ms.map((m) => m.tone || m.name).filter(Boolean).join(' & ');
}

// opts.memberTags: [Verse 1: breathy female vocal] 처럼 보컬 톤을 태그에 붙임
// opts.arrangeHints: 편곡 탭의 에너지·악기를 태그에 붙임
// opts.keepAdlibs: (괄호) 애드립 유지. Suno는 괄호 안을 백보컬로 부른다.
export function buildLyrics(song, opts = {}) {
  const labels = sectionLabels(song.sections);
  return song.sections.map((s, i) => {
    const tag = [opts.memberTags ? memberTag(s, song.members) : '', opts.arrangeHints ? arrangeHint(song, s) : '']
      .filter(Boolean).join(', ');
    const head = `[${labels[i]}${tag ? `: ${tag}` : ''}]`;
    let body = s.text.trim();
    // 비워 둔 반복 코러스는 앞의 같은 섹션 가사를 그대로 쓴다
    if (!body) body = song.sections.slice(0, i).reverse().find((p) => p.type === s.type && p.text.trim())?.text.trim() || '';
    if (!opts.keepAdlibs) body = body.replace(/\s*\([^)]*\)/g, '').replace(/\n{2,}/g, '\n');
    if (!body && s.type === 'Dance Break') body = '[Instrumental]';
    return body ? `${head}\n${body}` : head;
  }).join('\n\n');
}

// 한국어로 부른다는 표시 (국내판). 한국어 비율이 50% 이상이면 장르 바로 뒤에 붙인다.
// 효과는 아직 검증 전이라 국내판 테스트에서 같은 가사로 테이크를 비교한다 (docs/research/sounds-korean-2026-10-12.md).
// 부르는 언어를 직접 밝힌 말만 본다 ('Korean ballad'·'Korean R&B with soulful vocals' 같은 장르 이름은 아님)
const SUNG_KOREAN = /\b(sung|singing|sings|vocals?|lyrics|rap(ping)?)\s+in\s+korean\b|\bkorean(-language)?\s+(?:[a-z-]+\s+){0,2}(lyrics|vocals?|vocalist|singing|singers?|rap)\b/i;

export function koreanTag(koRatio) {
  const ko = Number(koRatio);
  if (!(ko >= 50)) return '';
  return ko >= 90 ? 'sung in Korean, Korean lyrics' : 'sung in Korean, Korean lyrics with English hook';
}

// opts.koRatio: 곡의 한국어 비율. 없으면 표시를 붙이지 않는다 (번안판처럼 다른 언어로 부를 때).
export function buildStyle(style, opts = {}) {
  const parts = [
    style.genre,
    '',
    style.subgenre,
    style.bpm ? `${style.bpm} BPM` : '',
    style.key,
    style.vocals,
    style.instruments,
    style.production,
    style.extra,
  ].map((p) => (p || '').trim());
  const tag = koreanTag(opts.koRatio);
  // 다른 칸이 다 비었으면 붙이지 않고, 이미 한국어로 부른다고 적어 두었으면 겹쳐 붙이지 않는다
  if (tag && parts.some(Boolean) && !SUNG_KOREAN.test(parts.join(', '))) parts[1] = tag;
  return parts.filter(Boolean).join(', ');
}

// 곡의 Suno 스타일 글 (국내판: 한국어 비율에 따라 '한국어로 부름' 표시를 붙임). style을 주면 그 스타일로 (변형 A/B/C).
// Inst. 버전은 부르지 않으므로 붙이지 않는다. 취향 기록에는 이 글 대신 buildStyle(style)을 남긴다 (앱이 붙인 말을 취향으로 배우지 않게).
export function sunoStyle(song, style = song.style) {
  return buildStyle(style, { koRatio: song.instOf ? null : song.concept?.koRatio });
}
