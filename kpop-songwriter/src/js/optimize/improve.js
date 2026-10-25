// 자동 개선 루프: 점수 낮은 섹션을 고칠 점과 함께 다시 쓰게 하고, 점수가 오른 것만 남긴다.
import { writeLyrics } from '../ai.js';
import { scoreSong, scoreSection } from './lyricscore.js';

export const DEFAULT_THRESHOLD = 70;

// 반환: { report: [{id, label, before, after, kept, round}], updates: {sectionId: text} }
export async function improveLyrics(song, { threshold = DEFAULT_THRESHOLD, rounds = 2, signal, onStep = () => {} } = {}) {
  const work = JSON.parse(JSON.stringify(song)); // 원본은 건드리지 않고 사본에서 돈다
  const report = [];
  const updates = {};
  for (let round = 1; round <= rounds; round++) {
    const scored = scoreSong(work).sections.filter((s) => s.result && s.result.score < threshold);
    if (!scored.length || signal?.aborted) break;
    onStep(`${round}회차: ${scored.length}개 섹션 다시 쓰는 중`);
    const request = `점수가 낮은 섹션을 고친다. 섹션별 고칠 점: ${scored.map((s) => `[${s.label}] ${s.result.tips.join(' ')}`).join(' / ')} 내용과 분위기는 유지한다.`;
    const out = await writeLyrics(work, { targetIds: scored.map((s) => s.id), request, signal });
    out.forEach(({ id, text }) => {
      const sec = work.sections.find((x) => x.id === id);
      const prev = scored.find((s) => s.id === id);
      if (!sec || !prev) return;
      const next = scoreSection({ ...sec, text });
      const kept = !!next && next.score > prev.result.score;
      report.push({ id, label: prev.label, before: prev.result.score, after: next ? next.score : 0, kept, round });
      if (kept) {
        sec.text = text;
        updates[id] = text;
      }
    });
  }
  return { report, updates };
}
