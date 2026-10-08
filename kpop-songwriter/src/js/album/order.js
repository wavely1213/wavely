// 트랙 순서 추천 (AI 없이): 곡마다 BPM·평균 에너지·키·길이를 보고 흐름이 좋은 순서를 고른다.
// K-pop 미니앨범의 흔한 흐름: (짧은 인트로) → 타이틀곡 → 에너지 높은 수록곡들 → 잔잔한 곡으로 마무리.
import { songSeconds } from '../music/arrangement.js';

// 곡 특징: 길이(초), BPM, 섹션 길이로 가중한 평균 에너지(1~5), 키(5도권 위치)
export function trackTraits(song) {
  const m = song.music;
  let bars = 0;
  let e = 0;
  song.sections.forEach((s) => {
    const sm = m.sections[s.id];
    if (!sm) return;
    bars += sm.bars;
    e += sm.energy * sm.bars;
  });
  const fifths = ((m.root * 7) % 12 + (m.mode === 'minor' ? 3 * 7 : 0)) % 12; // 나란한조는 같은 자리
  return { seconds: songSeconds(song), bpm: m.bpm, energy: bars ? e / bars : 3, fifths };
}

const keyGap = (a, b) => { const d = Math.abs(a - b) % 12; return Math.min(d, 12 - d); };

// 순서 점수 (높을수록 좋음)와 이유
export function orderScore(items) {
  let score = 0;
  const why = [];
  const n = items.length;
  const short = (x) => x.t.seconds < 90 && !x.isTitle; // 인트로·인터루드
  const intro = n > 2 && short(items[0]);
  const titleAt = items.findIndex((x) => x.isTitle);
  if (intro && titleAt === 1) { score += 3.5; why.push('짧은 인트로 다음에 타이틀곡'); } else if (titleAt === 0) { score += 3; why.push('타이틀곡이 1번'); }
  if (items.some((x, i) => i > 0 && short(x))) score -= 1; // 짧은 곡은 맨 앞이 자연스럽다
  const full = items.filter((x) => !short(x)); // 인트로는 빼고 본다 (인트로가 가장 잔잔해도 끝에 두지 않게)
  if (full.length > 2) {
    const minE = Math.min(...full.map((x) => x.t.energy));
    if (!short(items[n - 1]) && items[n - 1].t.energy === minE) { score += 2; why.push('가장 잔잔한 곡으로 마무리'); }
  }
  for (let i = 1; i < n; i++) {
    const a = items[i - 1].t;
    const b = items[i].t;
    if (Math.abs(a.bpm - b.bpm) < 4 && Math.abs(a.energy - b.energy) < 0.5) score -= 1; // 비슷한 곡이 연달아
    if (keyGap(a.fifths, b.fifths) <= 2) score += 0.3; // 가까운 키로 넘어감
  }
  if (n > 3) {
    const half = Math.floor(n / 2);
    const avg = (xs) => xs.reduce((s, x) => s + x.t.energy, 0) / xs.length;
    if (avg(items.slice(0, half)) > avg(items.slice(half))) { score += 1; why.push('앞쪽에 신나는 곡'); }
  }
  return { score, why };
}

function permutations(xs) {
  if (xs.length <= 1) return [xs];
  const out = [];
  xs.forEach((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).forEach((p) => out.push([x, ...p])));
  return out;
}

// 같은 입력이면 다시 계산하지 않는다 (수록곡 탭을 그릴 때마다 불림, 8곡이면 4만 가지)
let memo = { key: '', value: null };

// tracks: 앨범 트랙(순서대로), songs: 곡 목록. 반환: { order: [songId], why, better(지금보다 나은지), current, best }
export function suggestOrder(tracks, songs) {
  const items = tracks.map((t) => {
    const s = songs.find((x) => x.id === t.songId);
    return s ? { id: t.songId, isTitle: !!t.isTitle, t: trackTraits(s) } : null;
  }).filter(Boolean);
  const key = JSON.stringify(items);
  if (memo.key === key) return memo.value;
  const value = search(items);
  memo = { key, value };
  return value;
}

function search(items) {
  const current = orderScore(items);
  if (items.length < 2) return { order: items.map((x) => x.id), why: current.why, better: false, current: current.score, best: current.score };
  // 8곡까지는 모든 순서를 본다(8! = 40320), 그 이상은 지금 순서에서 두 곡씩 바꿔 가며 나아지는 동안 반복
  let best = { list: items, ...current };
  if (items.length <= 8) {
    permutations(items).forEach((p) => { const r = orderScore(p); if (r.score > best.score + 1e-9) best = { list: p, ...r }; });
  } else {
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const p = [...best.list];
          [p[i], p[j]] = [p[j], p[i]];
          const r = orderScore(p);
          if (r.score > best.score + 1e-9) { best = { list: p, ...r }; improved = true; }
        }
      }
    }
  }
  return { order: best.list.map((x) => x.id), why: best.why, better: best.score > current.score + 1e-9, current: current.score, best: best.score };
}
