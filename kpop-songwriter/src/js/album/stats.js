// 발매 후 성과: 날짜마다 트랙별 누적 재생 수(여러 플랫폼 합)를 적고, 어느 곡이 반응이 좋은지 본다.
// 반응 좋은 곡은 취향 기록에 넣어 다음 곡의 편곡·작사에 반영한다 (learn/taste.js 경로 그대로).
import { makeEntry, addEntry } from '../learn/taste.js';
import { keyName } from '../music/theory.js';
import { plainLyrics } from './lyrics.js';

// 같은 날짜는 덮어쓴다. values: { songId: 숫자 } (빈 값은 빼고)
export function addSnapshot(album, date, values) {
  const plays = {};
  Object.entries(values).forEach(([id, v]) => { const n = Number(v); if (Number.isFinite(n) && n >= 0 && String(v).trim() !== '') plays[id] = Math.round(n); });
  if (!date || !Object.keys(plays).length) return false;
  album.stats = [...(album.stats || []).filter((s) => s.date !== date), { date, plays }].sort((a, b) => a.date.localeCompare(b.date));
  return true;
}

// 트랙별: 최근 누적, 그 전 기록 대비 늘어난 수, 전체에서 차지하는 비율, 날짜별 값(그래프용)
export function trackSummary(album, songs) {
  const stats = album.stats || [];
  const rows = album.tracks.map((t) => {
    const s = songs.find((x) => x.id === t.songId);
    if (!s) return null;
    const series = stats.filter((d) => Number.isFinite(d.plays[t.songId])).map((d) => ({ date: d.date, plays: d.plays[t.songId] }));
    const latest = series.length ? series[series.length - 1].plays : null;
    const prev = series.length > 1 ? series[series.length - 2].plays : null;
    return { songId: t.songId, title: s.title.replace(/^예시:\s*/, ''), isTitle: !!t.isTitle, latest, growth: latest != null && prev != null ? latest - prev : null, series };
  }).filter(Boolean);
  const total = rows.reduce((a, r) => a + (r.latest || 0), 0);
  rows.forEach((r) => { r.share = total && r.latest != null ? Math.round((r.latest / total) * 1000) / 10 : null; });
  return rows;
}

// 반응이 좋은 곡: 재생이 가장 많고, 평균의 1.2배 이상이며 두 곡 이상 기록이 있을 때
export function standout(rows) {
  const withData = rows.filter((r) => r.latest != null);
  if (withData.length < 2) return null;
  const avg = withData.reduce((a, r) => a + r.latest, 0) / withData.length;
  const best = withData.reduce((a, r) => (r.latest > a.latest ? r : a));
  return best.latest >= avg * 1.2 && best.latest > 0 ? best : null;
}

// 반응 좋은 곡을 취향 기록에 넣는다: 편곡(BPM·악기 통계에 들어감) + 코러스 가사(좋아한 예시로 들어감)
export function learnFromRelease(taste, album, song) {
  const inst = new Set();
  Object.values(song.music.sections).forEach((sm) => sm.instruments.forEach((i) => inst.add(i)));
  const ref = `release:${album.id}:${song.id}`;
  addEntry(taste, makeEntry({ kind: 'arrange', rating: 1, text: `발매 후 반응이 좋았던 곡 「${song.title}」의 편곡`, context: { ref, source: 'release', bpm: song.music.bpm, key: keyName(song.music.root, song.music.mode), instruments: [...inst], song: song.title } }));
  const chorus = song.sections.find((s) => s.type === 'Chorus' && s.text.trim());
  const text = chorus ? chorus.text : plainLyrics(song).split('\n\n')[0] || '';
  if (text) addEntry(taste, makeEntry({ kind: 'lyrics', rating: 1, text, context: { ref: `${ref}:lyrics`, source: 'release', section: chorus ? 'Chorus' : '', song: song.title } }));
}
