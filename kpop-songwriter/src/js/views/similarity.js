// 구조·가사 탭 > 유사 표현 점검 카드: AI가 짚은 줄, 제안으로 바꾸기, 괜찮다고 표시.
import { h } from '../dom.js';
import { mutateSong } from '../state.js';
import { isBusy, runJob } from '../aijob.js';
import { checkSimilarity, similarityStatus, replaceLine } from '../optimize/similarity.js';
import { lyricsKey } from '../album/lyrics.js';

const LEVEL = { high: '거의 같음', check: '확인' };

export function renderSimilarity(song) {
  const busy = isBusy();
  const r = song.similarity;
  const status = similarityStatus(song);
  const hasLyrics = song.sections.some((s) => s.text.trim());
  const run = () => runJob('유사 표현 점검 중', async (signal) => {
    const res = await checkSimilarity(song, { signal });
    mutateSong(song.id, (x) => { x.similarity = res; });
  });
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, '유사 표현 점검'),
      h('button', { type: 'button', class: 'btn', id: 'similarity-run', disabled: busy || !hasLyrics, onclick: run }, r ? '다시 점검' : '점검받기')),
    h('p', { class: 'muted small' }, '발매 전에, 유명한 곡의 가사·훅과 너무 비슷한 줄이 있는지 AI가 짚어 줘요. AI 기억에 기댄 참고용이라 놓치거나 잘못 짚을 수 있어요 — 걸린 줄은 직접 검색해 확인하세요.'),
    !r ? null : h('div', { class: 'stack' },
      status === 'stale' ? h('p', { class: 'warn' }, '점검한 뒤 가사가 바뀌었어요. 다시 점검해 주세요.') : null,
      r.summary ? h('p', null, r.summary) : null,
      r.items.length
        ? h('ul', { class: 'similar-list' }, r.items.map((it) => h('li', { class: `similar${it.ok ? ' ok' : ''}` },
          h('div', { class: 'row' },
            h('span', { class: `pill ${it.level === 'high' ? 'warn-pill' : ''}` }, it.fixed ? '바꿈' : it.ok ? '괜찮음' : LEVEL[it.level]),
            h('strong', { class: 'similar-line' }, it.line)),
          h('p', { class: 'small' }, it.like ? h('span', { class: 'muted' }, `비슷한 곡: ${it.like} · `) : null, it.why),
          it.ok ? null : h('div', { class: 'row' },
            it.fix ? h('button', { type: 'button', class: 'btn small', disabled: busy || status === 'stale', onclick: () => mutateSong(song.id, (x) => {
              replaceLine(x, it.line, it.fix);
              const own = x.similarity.items.find((y) => y.id === it.id);
              own.line = it.fix;
              own.ok = true;
              own.fixed = true;
              // 걸린 줄만 바꿨으니 나머지 결과는 그대로 유효 — 열쇠를 지금 가사로
              x.similarity.key = lyricsKey(x);
            }) }, `"${it.fix}"로 바꾸기`) : null,
            h('button', { type: 'button', class: 'btn small ghost', onclick: () => mutateSong(song.id, (x) => {
              const own = x.similarity.items.find((y) => y.id === it.id);
              if (own) own.ok = true;
            }) }, '확인했어요, 괜찮아요')))))
        : h('p', { class: 'good-text' }, '눈에 띄게 비슷한 줄을 찾지 못했어요.')),
  );
}
