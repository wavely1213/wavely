// 멤버 불러오기: 같은 그룹으로 여러 곡을 만들 때 다른 곡의 멤버 구성을 그대로 가져온다.
import { uid } from './dom.js';
import { autoDistribute } from './structure.js';

const signature = (s) => s.members.map((m) => `${m.name}/${m.position}/${m.voice || ''}`).join('|');

// 멤버가 있는 다른 곡들 (같은 구성은 최근 곡 하나만). 반환: [{ id, label }]
export function memberSources(songs, song) {
  const seen = new Set();
  return songs
    .filter((s) => s.id !== song.id && s.members?.length)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .filter((s) => { const k = signature(s); if (seen.has(k)) return false; seen.add(k); return true; })
    .map((s) => ({ id: s.id, label: `${s.title.replace(/^예시:\s*/, '')} — ${s.members.map((m) => m.name).join('·')}` }));
}

// song(고칠 사본)에 from의 멤버(새 id)·그룹 종류를 넣고, 파트가 비어 있으면 자동으로 나눈다.
export function importMembers(song, from) {
  song.members = from.members.map((m) => ({ ...m, id: uid() }));
  song.concept.group = from.concept?.group || song.concept.group;
  if (!song.sections.some((s) => s.members.length)) song.sections = autoDistribute(song.sections, song.members);
}
