// 곡 구조: 섹션 생성, 템플릿 적용, 번호 매기기, 멤버 자동 분배.
import { TEMPLATES, INSTRUMENTAL_TYPES, ALL_MEMBER_TYPES } from './constants.js';
import { uid } from './dom.js';
import { countSyllables } from './lyrictools.js';

export function makeSection(type, text = '') {
  return { id: uid(), type, members: [], text };
}

export function sectionsFromTemplate(key) {
  const t = TEMPLATES[key] || TEMPLATES.standard;
  return t.parts.map((type) => makeSection(type));
}

// "Verse 1", "Chorus 2" 같은 표시 이름. 한 번만 나오는 타입은 번호 없이.
export function sectionLabels(sections) {
  const total = {};
  sections.forEach((s) => { total[s.type] = (total[s.type] || 0) + 1; });
  const seen = {};
  return sections.map((s) => {
    seen[s.type] = (seen[s.type] || 0) + 1;
    if (s.type === 'Chorus' && seen[s.type] === total[s.type] && total[s.type] > 2) return 'Final Chorus';
    return total[s.type] > 1 ? `${s.type} ${seen[s.type]}` : s.type;
  });
}

// 솔로 파트를 멤버에게 돌아가며 분배. 코러스는 전원, 인트로·댄스브레이크는 비움.
// 랩 섹션은 래퍼 포지션 멤버가 있으면 그들에게 먼저 준다.
export function autoDistribute(sections, members) {
  if (!members.length) return sections.map((s) => ({ ...s, members: [] }));
  const rappers = members.filter((m) => /래퍼/.test(m.position || ''));
  const singers = members.filter((m) => !/래퍼/.test(m.position || ''));
  const vocalPool = singers.length ? singers : members;
  const rapPool = rappers.length ? rappers : members;
  let v = 0;
  let r = 0;
  return sections.map((s) => {
    if (INSTRUMENTAL_TYPES.includes(s.type)) return { ...s, members: [] };
    if (ALL_MEMBER_TYPES.includes(s.type)) return { ...s, members: members.map((m) => m.id) };
    if (s.type === 'Rap') return { ...s, members: [rapPool[r++ % rapPool.length].id] };
    // 벌스·프리코러스·브릿지는 두 명씩 나눠 부른다 (멤버가 3명 이상일 때)
    const take = members.length >= 3 && s.type !== 'Bridge' ? 2 : 1;
    const ids = [];
    for (let i = 0; i < take; i++) ids.push(vocalPool[v++ % vocalPool.length].id);
    return { ...s, members: [...new Set(ids)] };
  });
}

// 비워 둔 반복 섹션은 앞의 같은 종류 가사를 다시 부른다 (Suno 가사·가사지와 같은 규칙)
function sungText(sections, i) {
  const s = sections[i];
  if (s.text.trim()) return s.text;
  return sections.slice(0, i).reverse().find((p) => p.type === s.type && p.text.trim())?.text || '';
}

// 멤버별 몫: 섹션마다 measure(가사)를 그 섹션 멤버 수로 나눠 더한다
function shareBy(sections, members, measure) {
  const share = Object.fromEntries(members.map((m) => [m.id, 0]));
  sections.forEach((s, i) => {
    const amount = measure(sungText(sections, i));
    const ms = s.members.filter((id) => id in share);
    if (!ms.length || !amount) return;
    ms.forEach((id) => { share[id] += amount / ms.length; });
  });
  return share;
}

// 멤버별 담당 줄 수 (파트 분배 균형 확인용). 여러 명이 맡은 섹션은 줄을 나눠 센다.
export const lineShare = (sections, members) => shareBy(sections, members, (t) => t.split('\n').filter((l) => l.trim()).length);
// 부르는 양 (애드립 괄호를 뺀 음절 수) — 줄 길이가 달라도 실제 분량에 가깝다
export const syllableShare = (sections, members) => shareBy(sections, members, (t) => t.split('\n').reduce((n, l) => n + countSyllables(l), 0));
