// 구조·가사 탭 > 맞춤법·띄어쓰기 점검 카드: 고칠 곳 보기, 하나씩 또는 모두 고치기, 그대로 두기.
import { h } from '../dom.js';
import { mutateSong } from '../state.js';
import { isBusy, runJob } from '../aijob.js';
import { checkSpelling, spellingStatus } from '../optimize/spelling.js';
import { replaceLine } from '../optimize/linecheck.js';
import { lyricsKey } from '../album/lyrics.js';

// 고친 줄만 바뀌었으니 나머지 결과는 그대로 유효 — 열쇠를 지금 가사로
function applyFix(x, ids) {
  x.spelling.items.filter((it) => ids.includes(it.id) && !it.ok).forEach((it) => {
    replaceLine(x, it.line, it.fixed);
    it.ok = true;
    it.applied = true;
  });
  x.spelling.key = lyricsKey(x);
}

export function renderSpelling(song) {
  const busy = isBusy();
  const r = song.spelling;
  const status = spellingStatus(song);
  const open = r ? r.items.filter((it) => !it.ok) : [];
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, '맞춤법·띄어쓰기 점검'),
      h('div', { class: 'row' },
        open.length > 1 && status !== 'stale' ? h('button', { type: 'button', class: 'btn small', id: 'spell-all', disabled: busy, onclick: () => mutateSong(song.id, (x) => applyFix(x, open.map((it) => it.id))) }, `모두 고치기 (${open.length})`) : null,
        h('button', { type: 'button', class: 'btn', id: 'spell-run', disabled: busy || !song.sections.some((s) => s.text.trim()), onclick: () => runJob('맞춤법 점검 중', async (signal) => {
          const res = await checkSpelling(song, { signal });
          mutateSong(song.id, (x) => { x.spelling = res; });
        }) }, r ? '다시 점검' : '점검받기'))),
    h('p', { class: 'muted small' }, '가사는 멜론·스포티파이 등에 그대로 보여요. 확실히 틀린 곳만 짚고, 노래 말투(줄임말·구어)는 그대로 둬요.'),
    !r ? null : h('div', { class: 'stack' },
      status === 'stale' ? h('p', { class: 'warn' }, '점검한 뒤 가사가 바뀌었어요. 다시 점검해 주세요.') : null,
      r.items.length ? h('ul', { class: 'similar-list' }, r.items.map((it) => h('li', { class: `similar${it.ok ? ' ok' : ''}` },
        h('div', { class: 'spell-pair' },
          h('span', { class: 'spell-old' }, it.line),
          h('span', { 'aria-hidden': 'true' }, '→'),
          h('strong', { class: 'spell-new' }, it.fixed)),
        it.why ? h('p', { class: 'muted small' }, it.why) : null,
        it.ok ? h('span', { class: 'pill' }, it.applied ? '고침' : '그대로 둠') : h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn small', disabled: busy || status === 'stale', onclick: () => mutateSong(song.id, (x) => applyFix(x, [it.id])) }, '고치기'),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => mutateSong(song.id, (x) => { const own = x.spelling.items.find((y) => y.id === it.id); if (own) own.ok = true; }) }, '그대로 두기')))))
        : h('p', { class: 'good-text' }, '고칠 곳을 찾지 못했어요.')),
  );
}
