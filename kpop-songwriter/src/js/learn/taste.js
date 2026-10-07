// 취향 학습: AI 결과에 대한 반응(👍/👎·고친 내용)을 모아 프로필로 정리하고, 모든 AI 요청에 넣는다.
// 모델 자체를 학습시키지는 않는다. 기록은 JSONL로 내보내 나중에 파인튜닝 데이터로 쓸 수 있다.
import { uid } from '../dom.js';

export const MAX_LOG = 150; // 문서 크기 한도(256KB) 안에 들도록
const CLIP = 400;

export const DISLIKE_REASONS = ['어색해요', '유치해요', '컨셉과 달라요', '영어가 너무 많아요', '라임이 약해요', '너무 뻔해요', '음역이 안 맞아요'];

export function emptyTaste() {
  return {
    enabled: true,
    profile: { lyrics: '', avoid: '', sound: '', updatedAt: 0 },
    log: [],
  };
}

export function normalizeTaste(t) {
  const base = emptyTaste();
  return { ...base, ...(t || {}), profile: { ...base.profile, ...(t?.profile || {}) }, log: Array.isArray(t?.log) ? t.log : [] };
}

const clip = (s) => String(s ?? '').slice(0, CLIP);

// kind: lyrics | hook | arrange | melody | style
// rating: 1(좋아요) | -1(별로) | 0(고침 — before/after)
export function makeEntry({ kind, rating, text = '', before = '', after = '', reasons = [], context = {} }) {
  return { id: uid(), at: Date.now(), kind, rating, text: clip(text), before: clip(before), after: clip(after), reasons, context };
}

export function addEntry(taste, entry) {
  // 같은 대상(context.ref)에 대한 이전 평가는 새것으로 바꾼다
  const ref = entry.context?.ref;
  const log = ref ? taste.log.filter((e) => !(e.context?.ref === ref && e.kind === entry.kind && (e.rating === 0) === (entry.rating === 0))) : [...taste.log];
  log.push(entry);
  taste.log = log.slice(-MAX_LOG);
}

export function removeEntry(taste, id) {
  taste.log = taste.log.filter((e) => e.id !== id);
}

// 기록에서 바로 계산하는 통계 (AI 없이)
export function tasteStats(taste) {
  const by = (k) => taste.log.filter((e) => e.kind === k);
  const liked = taste.log.filter((e) => e.rating === 1);
  const disliked = taste.log.filter((e) => e.rating === -1);
  const reasons = {};
  disliked.forEach((e) => e.reasons.forEach((r) => { reasons[r] = (reasons[r] || 0) + 1; }));
  const likedArr = by('arrange').filter((e) => e.rating === 1);
  const bpms = likedArr.map((e) => e.context.bpm).filter(Number.isFinite);
  const inst = {};
  likedArr.forEach((e) => (e.context.instruments || []).forEach((i) => { inst[i] = (inst[i] || 0) + 1; }));
  return {
    total: taste.log.length,
    liked: liked.length,
    disliked: disliked.length,
    edits: taste.log.filter((e) => e.rating === 0).length,
    reasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]),
    bpmRange: bpms.length ? [Math.min(...bpms), Math.max(...bpms)] : null,
    instruments: Object.entries(inst).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 5),
  };
}

// AI 요청에 붙일 취향 블록. kind에 맞는 좋아한 예시를 몇 개 넣는다.
export function promptBlock(taste, kind = 'lyrics') {
  if (!taste?.enabled) return '';
  const p = taste.profile;
  const lines = [];
  if (p.lyrics.trim()) lines.push(`작사 스타일: ${p.lyrics.trim()}`);
  if (p.sound.trim()) lines.push(`좋아하는 사운드·편곡: ${p.sound.trim()}`);
  if (p.avoid.trim()) lines.push(`피할 것: ${p.avoid.trim()}`);
  const stats = tasteStats(taste);
  if (stats.reasons.length) lines.push(`예전에 싫다고 한 이유: ${stats.reasons.slice(0, 4).map(([r, n]) => `${r}(${n})`).join(', ')}`);
  const sameKind = taste.log.filter((e) => e.kind === kind);
  const liked = sameKind.filter((e) => e.rating === 1 && e.text).slice(-4).map((e) => e.text);
  const edits = sameKind.filter((e) => e.rating === 0 && e.before && e.after).slice(-3);
  if (liked.length) lines.push(`좋아한 예시 (말투·결을 참고, 그대로 베끼지 말 것):\n${liked.map((t) => `- ${t.replace(/\n/g, ' / ')}`).join('\n')}`);
  if (edits.length) lines.push(`AI 초안을 작곡가가 이렇게 고쳤다 (고친 방향을 따를 것):\n${edits.map((e) => `- 전: ${e.before.replace(/\n/g, ' / ')}\n  후: ${e.after.replace(/\n/g, ' / ')}`).join('\n')}`);
  if (kind === 'arrange' && stats.bpmRange) lines.push(`좋아한 편곡의 BPM 범위: ${stats.bpmRange[0]}~${stats.bpmRange[1]}`);
  if (kind === 'arrange' && stats.instruments.length) lines.push(`좋아한 편곡에 자주 쓴 악기 id: ${stats.instruments.join(', ')}`);
  if (!lines.length) return '';
  return `작곡가의 취향 (반드시 반영):\n${lines.join('\n')}`;
}

export function toJsonl(taste) {
  return taste.log.map((e) => JSON.stringify({
    at: new Date(e.at).toISOString(), kind: e.kind, rating: e.rating, text: e.text, before: e.before, after: e.after, reasons: e.reasons, context: e.context,
  })).join('\n') + (taste.log.length ? '\n' : '');
}
