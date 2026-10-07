// 지분(스플릿) 시트: 트랙마다 작사·작곡·편곡을 여러 명이 했으면 누가 몇 %인지. 저작권 신고·정산의 기준.
// 저장: track.splits = { lyric: { 이름: % }, music: {...}, arrange: {...} } — 적지 않은 역할은 똑같이 나눈 것으로 본다.
export const ROLES = [
  { key: 'lyric', field: 'lyricists', name: '작사' },
  { key: 'music', field: 'composers', name: '작곡' },
  { key: 'arrange', field: 'arrangers', name: '편곡' },
];

// "A, B & C" → ['A', 'B', 'C'] (중복 제거)
export function names(str) {
  return [...new Set(String(str || '').split(/[,，、·&/]+|\s+and\s+/i).map((x) => x.trim()).filter(Boolean))];
}

const round2 = (v) => Math.round(v * 100) / 100;

// 똑같이 나누기 (마지막 사람이 나머지를 받아 합이 정확히 100)
export function equalShares(list) {
  if (!list.length) return [];
  const each = round2(100 / list.length);
  return list.map((name, i) => ({ name, share: i === list.length - 1 ? round2(100 - each * (list.length - 1)) : each }));
}

// 역할별 [{ name, share }] 와 직접 적었는지(custom)
export function splitsFor(track) {
  return ROLES.map((r) => {
    const people = names(track[r.field]);
    const saved = track.splits?.[r.key] || {};
    const custom = people.length > 1 && people.some((p) => Number.isFinite(saved[p]));
    const list = custom ? people.map((name) => ({ name, share: Number.isFinite(saved[name]) ? saved[name] : 0 })) : equalShares(people);
    const sum = round2(list.reduce((a, x) => a + x.share, 0));
    return { ...r, people: list, custom, sum };
  });
}

// 합이 100이 아닌 역할 (직접 적은 것만)
export function splitIssues(track) {
  return splitsFor(track).filter((r) => r.custom && Math.abs(r.sum - 100) > 0.01);
}

// 지분 시트 CSV 행
export function splitRows(album, songs) {
  const rows = [['Track', 'Title', 'Role', 'Name', 'Share %', 'Agreed']];
  album.tracks.forEach((t, i) => {
    const s = songs.find((x) => x.id === t.songId);
    if (!s) return;
    splitsFor(t).forEach((r) => r.people.forEach((p) => rows.push([i + 1, s.title.replace(/^예시:\s*/, ''), r.name, p.name, p.share, r.people.length === 1 || r.custom ? 'Y' : 'equal (not set)'])));
  });
  return rows;
}
