// 곡 분위기 → 커버 모양·색 추천 (AI 없이). 타이틀곡 분위기를 먼저, 없으면 수록곡 전체.
import { PALETTES, TEMPLATES } from './cover.js';

// 분위기 하나가 미는 색·모양 (PALETTES 이름, TEMPLATES 키)
const MOOD_PICK = {
  몽환: ['새벽', 'gradient'], 다크: ['새벽', 'minimal'], 서정: ['새벽', 'gradient'], 감성: ['복숭아', 'circle'],
  청량: ['민트', 'gradient'], 하이틴: ['복숭아', 'type'], 걸크러시: ['흑백', 'type'], 섹시: ['흑백', 'minimal'],
  파워풀: ['노을', 'type'], 레트로: ['노을', 'circle'], Y2K: ['네온', 'circle'], 키치: ['네온', 'type'],
};

export function coverMoods(album, songs) {
  const title = album.tracks.find((t) => t.isTitle);
  const pick = (ids) => [...new Set(ids.flatMap((id) => songs.find((s) => s.id === id)?.concept?.moods || []))];
  const fromTitle = title ? pick([title.songId]) : [];
  return fromTitle.length ? fromTitle : pick(album.tracks.map((t) => t.songId));
}

// 반환: { template, palette(번호), moods } — 분위기가 없거나 모르는 것뿐이면 null
export function suggestCover(moods) {
  const votes = { palette: {}, template: {} };
  moods.forEach((m, i) => {
    const p = MOOD_PICK[m];
    if (!p) return;
    const w = 3 - Math.min(2, i); // 앞의 분위기일수록 무게
    votes.palette[p[0]] = (votes.palette[p[0]] || 0) + w;
    votes.template[p[1]] = (votes.template[p[1]] || 0) + w;
  });
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0]?.[0];
  const pal = top(votes.palette);
  const tpl = top(votes.template);
  if (!pal || !tpl || !TEMPLATES[tpl]) return null;
  return { palette: PALETTES.findIndex((p) => p.name === pal), template: tpl, moods: moods.filter((m) => MOOD_PICK[m]) };
}
