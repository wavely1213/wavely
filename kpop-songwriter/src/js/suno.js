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

export function buildStyle(style) {
  const parts = [
    style.genre,
    style.subgenre,
    style.bpm ? `${style.bpm} BPM` : '',
    style.key,
    style.vocals,
    style.instruments,
    style.production,
    style.extra,
  ];
  return parts.map((p) => (p || '').trim()).filter(Boolean).join(', ');
}
