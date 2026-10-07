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

// 줄 단위 반응: 마음에 드는 줄에만 ♥. 좋아한 줄은 다음 AI 요청에 "이런 표현이 좋다"로 들어간다.
// 같은 줄은 내용으로 구분하므로(ref#줄) 줄 순서가 바뀌어도 반응이 남는다.
const openLines = new Set();
export function lineLikes({ kind, ref, text, context = {} }) {
  const lines = [...new Set(text.split('\n').map((l) => l.trim()).filter((l) => l && !/^\[.*\]$/.test(l)))];
  if (lines.length < 2) return null;
  const log = getState().taste.log;
  const likedOf = (line) => log.find((e) => e.kind === kind && e.context?.ref === `${ref}#${line}`) || null;
  const count = lines.filter(likedOf).length;
  const toggle = (line) => mutateTaste((t) => {
    const on = likedOf(line);
    if (on) removeEntry(t, on.id);
    else addEntry(t, makeEntry({ kind, rating: 1, text: line, context: { ...context, ref: `${ref}#${line}`, line: true } }));
  });
  return h('details', { class: 'line-likes', open: openLines.has(ref), ontoggle: (e) => { if (e.target.open) openLines.add(ref); else openLines.delete(ref); } },
    h('summary', null, `마음에 드는 줄만 고르기${count ? ` · ♥ ${count}` : ''}`),
    h('ul', null, lines.map((line) => {
      const on = likedOf(line);
      return h('li', null,
        h('button', { type: 'button', class: `fb${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false', 'aria-label': `${on ? '좋아요 취소' : '이 줄 좋아요'}: ${line}`, onclick: () => toggle(line) }, on ? '♥' : '♡'),
        h('span', null, line));
    })));
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
