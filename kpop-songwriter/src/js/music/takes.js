// Suno 테이크 비교: 분석값(BPM·키·길이)을 내 편곡과 비교해 어느 테이크가 의도에 가까운지 본다.
import { keyName } from './theory.js';
import { songSeconds } from './arrangement.js';

// 같은 키이거나 나란한조(C major ↔ A minor)면 일치로 본다
export function keyMatch(root, mode, wantRoot, wantMode) {
  if (root === wantRoot && mode === wantMode) return 'same';
  const relative = mode === 'major' ? (root + 9) % 12 : (root + 3) % 12;
  if (relative === wantRoot && mode !== wantMode) return 'relative';
  return 'different';
}

// BPM은 ±3, 또는 절반·두 배(분석이 하프타임으로 잡는 경우)까지 일치로 본다
export function bpmMatch(bpm, want) {
  const near = (a, b) => Math.abs(a - b) <= 3;
  if (near(bpm, want)) return 'same';
  if (near(bpm * 2, want) || near(bpm / 2, want)) return 'half';
  return 'different';
}

// 반환: { score(0~3), notes: [문구] }
export function compareTake(analysis, song) {
  const m = song.music;
  const notes = [];
  let score = 0;
  const b = bpmMatch(analysis.bpm, m.bpm);
  if (b === 'same') { score += 1; notes.push(`BPM ${analysis.bpm} ✓`); } else if (b === 'half') { score += 1; notes.push(`BPM ${analysis.bpm} (절반·두 배로 잡힘) ✓`); } else notes.push(`BPM ${analysis.bpm} — 편곡은 ${m.bpm}`);
  const k = keyMatch(analysis.root, analysis.mode, m.root, m.mode);
  const kn = keyName(analysis.root, analysis.mode);
  if (k === 'same') { score += 1; notes.push(`키 ${kn} ✓`); } else if (k === 'relative') { score += 1; notes.push(`키 ${kn} (나란한조) ✓`); } else notes.push(`키 ${kn} — 편곡은 ${keyName(m.root, m.mode)}${analysis.keyConfidence < 0.5 ? ' (분석 확신 낮음)' : ''}`);
  const want = songSeconds(song);
  const diff = analysis.duration - want;
  if (Math.abs(diff) <= Math.max(20, want * 0.15)) { score += 1; notes.push(`길이 ${Math.round(analysis.duration)}초 ✓`); } else notes.push(`길이 ${Math.round(analysis.duration)}초 — 편곡은 ${Math.round(want)}초`);
  return { score, notes };
}
