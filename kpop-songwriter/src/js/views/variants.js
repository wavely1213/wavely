// 스타일 탭 > 스타일 변형 A/B/C 카드: 만들기, 각각 복사, 정하기.
import { h, copyText } from '../dom.js';
import { mutateSong } from '../state.js';
import { isBusy, runJob } from '../aijob.js';
import { suggestVariants, variantStyle } from '../variants.js';
import { buildStyle } from '../suno.js';
import { SUNO_LIMITS } from '../constants.js';

export function renderVariants(song) {
  const busy = isBusy();
  const sv = song.styleVariants;
  const current = buildStyle(song.style);
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, '스타일 변형 A/B/C (선택)'),
      h('button', { type: 'button', class: 'btn', id: 'variants-run', disabled: busy, onclick: () => runJob('스타일 변형 만드는 중', async (signal) => {
        const res = await suggestVariants(song, { signal });
        mutateSong(song.id, (x) => { x.styleVariants = res; });
      }) }, sv ? '다시 만들기' : '변형 3개 만들기')),
    h('p', { class: 'muted small' }, '같은 가사로 세 방향을 Suno에서 뽑아 보고 고르는 방법이에요. 각각 복사해 Suno에 넣고, 받은 파일 이름 끝에 A·B·C를 붙여 마스터링 탭의 "테이크 비교"에 넣으면 어느 스타일인지 같이 보여요. BPM·키는 그대로예요.'),
    sv ? h('ul', { class: 'variants' }, sv.items.map((v) => {
      const text = buildStyle(variantStyle(song, v));
      const ta = h('textarea', { class: 'out mono', rows: '2', readonly: true, value: text, 'aria-label': `스타일 ${v.id}` });
      const chosen = text === current;
      return h('li', { class: `variant${chosen ? ' chosen' : ''}` },
        h('div', { class: 'row' },
          h('span', { class: 'tag mono' }, v.id),
          h('span', null, v.idea),
          h('span', { class: 'push' }),
          h('span', { class: `mono muted small${text.length > SUNO_LIMITS.style ? ' over' : ''}` }, `${text.length}자`),
          h('button', { type: 'button', class: 'btn small primary', onclick: () => copyText(ta.value, ta) }, '복사'),
          chosen ? h('span', { class: 'pill good' }, '지금 스타일')
            : h('button', { type: 'button', class: 'btn small', onclick: () => mutateSong(song.id, (x) => { Object.assign(x.style, v.style); }) }, '이걸로 정하기')),
        ta);
    })) : null,
  );
}
