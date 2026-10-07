// AI 결과 옆에 붙는 👍/👎 막대. 👎를 누르면 이유를 고를 수 있다. 기록은 취향 학습에 쓰인다.
import { h } from '../dom.js';
import { getState, mutateTaste } from '../state.js';
import { makeEntry, addEntry, removeEntry, DISLIKE_REASONS } from './taste.js';

function existing(kind, ref) {
  return getState().taste.log.filter((e) => e.kind === kind && e.context?.ref === ref && e.rating !== 0).pop() || null;
}

// opts: { kind, ref(대상 id), text(평가 대상 내용), context(추가 정보), label }
export function feedbackBar({ kind, ref, text, context = {}, label = 'AI 결과가 마음에 드나요?' }) {
  const cur = existing(kind, ref);
  const rate = (rating) => mutateTaste((t) => {
    if (cur && cur.rating === rating) { removeEntry(t, cur.id); return; }
    addEntry(t, makeEntry({ kind, rating, text, context: { ...context, ref } }));
  });
  const toggleReason = (r) => mutateTaste((t) => {
    const e = t.log.find((x) => x.id === cur.id);
    if (e) e.reasons = e.reasons.includes(r) ? e.reasons.filter((x) => x !== r) : [...e.reasons, r];
  });
  return h('div', { class: 'feedback' },
    h('span', { class: 'muted small' }, label),
    h('button', { type: 'button', class: `fb${cur?.rating === 1 ? ' on' : ''}`, 'aria-pressed': cur?.rating === 1 ? 'true' : 'false', onclick: () => rate(1) }, '👍 좋아요'),
    h('button', { type: 'button', class: `fb${cur?.rating === -1 ? ' on' : ''}`, 'aria-pressed': cur?.rating === -1 ? 'true' : 'false', onclick: () => rate(-1) }, '👎 별로'),
    cur?.rating === -1 ? h('div', { class: 'chips small' }, DISLIKE_REASONS.map((r) => h('button', {
      type: 'button', class: `chip${cur.reasons.includes(r) ? ' on' : ''}`, 'aria-pressed': cur.reasons.includes(r) ? 'true' : 'false', onclick: () => toggleReason(r),
    }, r))) : null,
  );
}

// AI가 쓴 글을 사용자가 고치면 (멈춘 지 4초 뒤) 전·후를 기록한다
const timers = {};
export function trackEdit({ kind, ref, before, after, context = {} }) {
  clearTimeout(timers[ref]);
  if (!before || before.trim() === after.trim()) return;
  timers[ref] = setTimeout(() => {
    mutateTaste((t) => addEntry(t, makeEntry({ kind, rating: 0, before, after, context: { ...context, ref } })), 'quiet');
  }, 4000);
}
