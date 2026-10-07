// 내 취향 화면: 취향 프로필(직접 고치기·AI 정리), 반응 기록, 내보내기.
import { h, field, formatTime, toast } from '../dom.js';
import { getState, mutateTaste } from '../state.js';
import { tasteStats, toJsonl, removeEntry, newSinceSummary, SUMMARY_EVERY, preferencePairs, pairsJsonl } from '../learn/taste.js';
import { summarizeTaste } from '../learn/summarize.js';
import { isBusy, runJob, stopJob, job } from '../aijob.js';
import { INSTRUMENT_BY_ID } from '../music/instruments.js';
import { zip } from '../music/pack.js';
import { saveFile } from '../platform/download.js';
import { syllableRanges, DEFAULT_SYLLABLES, FALLBACK_SYLLABLES, MIN_LINES } from '../optimize/calibrate.js';

const KIND = { lyrics: '가사', hook: '훅', arrange: '편곡', melody: '멜로디', style: '스타일' };
const ui = { basis: '' };

// 채점 기준이 내 가사로 얼마나 옮겨졌는지 (보정된 종류만, 없으면 기본값 안내)
function renderRanges(taste) {
  const r = syllableRanges(taste);
  const types = Object.keys(r);
  if (!types.length || !taste.enabled) return h('span', { class: 'muted' }, `기본값 (섹션 종류마다 ${MIN_LINES}줄 넘게 👍·♥·고침이 쌓이면 내 가사 길이 쪽으로 옮겨 가요)`);
  return types.map((t) => {
    const def = DEFAULT_SYLLABLES[t] || FALLBACK_SYLLABLES;
    return h('span', { class: 'mono range-row' }, `${t} ${r[t].range[0]}~${r[t].range[1]}음절 (기본 ${def[0]}~${def[1]}, 내 가사 ${r[t].n}줄)`);
  });
}

export function renderTaste(saveLabel) {
  const { taste } = getState();
  const st = tasteStats(taste);
  const busy = isBusy();
  const p = taste.profile;
  const area = (id, label, key, placeholder) => field(label, h('textarea', {
    id, rows: '3', value: p[key], placeholder,
    oninput: (e) => mutateTaste((t) => { t.profile[key] = e.target.value; t.profile.updatedAt = Date.now(); }, 'quiet'),
  }));
  return h('main', { class: 'main' },
    h('header', { class: 'top' },
      h('div', { class: 'top-title' },
        h('p', { class: 'eyebrow' }, '취향 학습'),
        h('h1', null, '내 취향'),
        h('p', { class: 'save mono', id: 'save-status' }, saveLabel()))),
    h('div', { class: 'view' },
      h('section', { class: 'card' },
        h('div', { class: 'card-head' },
          h('h2', null, '취향 프로필'),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'taste-on', checked: taste.enabled, onchange: (e) => mutateTaste((t) => { t.enabled = e.target.checked; }) }), 'AI 요청에 반영')),
        newSinceSummary(taste) >= SUMMARY_EVERY ? h('p', { class: 'note' }, `지난 정리 뒤로 반응이 ${newSinceSummary(taste)}개 더 쌓였어요. "기록으로 AI가 정리하기"를 누르면 프로필이 최신 취향으로 바뀌어요.`) : null,
        h('p', { class: 'muted' }, 'AI 결과에 👍/👎를 누르거나 AI가 쓴 가사를 고치면 여기 기록돼요. 프로필은 모든 AI 요청(작사·훅·스타일·편곡·멜로디)에 함께 들어가요. 직접 써도 되고, 기록을 보고 AI가 정리하게 해도 돼요.'),
        area('taste-lyrics', '작사 스타일', 'lyrics', '예: 직설적인 표현보다 이미지로 감정을 보여 준다. 영어는 훅에만 짧게.'),
        area('taste-sound', '좋아하는 사운드·편곡', 'sound', '예: 벌스는 비우고 코러스에서 확 터지는 구성, 808과 플럭 신스.'),
        area('taste-avoid', '피할 것', 'avoid', '예: "사랑해" 같은 뻔한 단어 반복, 과한 영어 랩.'),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn primary', disabled: busy || st.total < 3, onclick: () => runJob('취향 정리 중', async (signal) => {
            const res = await summarizeTaste(taste, { signal });
            ui.basis = res.basis;
            mutateTaste((t) => { t.profile = { ...t.profile, lyrics: res.lyrics || t.profile.lyrics, sound: res.sound || t.profile.sound, avoid: res.avoid || t.profile.avoid, updatedAt: Date.now(), summarizedAt: Date.now() }; });
          }) }, '기록으로 AI가 정리하기'),
          busy ? h('button', { type: 'button', class: 'btn ghost', onclick: stopJob }, '중지') : null,
          busy ? h('span', { class: 'status' }, h('span', { class: 'dot' }), job.label) : null,
          st.total < 3 ? h('span', { class: 'muted small' }, '반응이 3개 이상 쌓이면 정리할 수 있어요') : null),
        ui.basis ? h('p', { class: 'note' }, `근거: ${ui.basis}`) : null),
      h('section', { class: 'card' },
        h('h2', null, '지금까지의 반응'),
        h('dl', { class: 'facts' },
          h('dt', null, '기록'), h('dd', { class: 'mono' }, `${st.total}개 (👍 ${st.liked} · 👎 ${st.disliked} · 고침 ${st.edits})`),
          h('dt', null, '자주 나온 불만'), h('dd', null, st.reasons.length ? st.reasons.slice(0, 4).map(([r, n]) => `${r} ${n}`).join(', ') : '—'),
          h('dt', null, '좋아한 편곡 BPM'), h('dd', { class: 'mono' }, st.bpmRange ? `${st.bpmRange[0]}~${st.bpmRange[1]}` : '—'),
          h('dt', null, '좋아한 편곡 악기'), h('dd', null, st.instruments.length ? st.instruments.map((i) => INSTRUMENT_BY_ID[i]?.name || i).join(', ') : '—'),
          h('dt', null, '가사 채점 줄 길이'), h('dd', { id: 'taste-ranges' }, renderRanges(taste))),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn small', disabled: !st.total, onclick: async () => {
            const res = await saveFile('taste-feedback.zip', zip([
              { name: 'taste-feedback.jsonl', data: toJsonl(taste) },
              { name: 'preference-pairs.jsonl', data: pairsJsonl(taste) },
              { name: 'profile.json', data: JSON.stringify(taste.profile, null, 1) },
            ]));
            if (res === 'saved') toast('받았어요');
          } }, '기록 내보내기 (JSONL)'),
          h('span', { class: 'muted small' }, `나중에 모델을 파인튜닝할 때 학습 데이터로 쓸 수 있어요. 고른 것·버린 것 쌍 ${preferencePairs(taste).length}개(선호 학습용)도 함께 들어가요.`))),
      taste.log.length
        ? h('ol', { class: 'versions' }, [...taste.log].reverse().slice(0, 40).map((e) => h('li', { class: 'version' },
          h('div', { class: 'version-head' },
            h('span', { class: 'mono muted' }, formatTime(e.at)),
            h('span', { class: 'pill' }, KIND[e.kind] || e.kind),
            h('strong', null, e.rating === 1 ? (e.context?.line ? '♥ 줄' : '👍') : e.rating === -1 ? '👎' : '고침'),
            e.reasons.length ? h('span', { class: 'muted small' }, e.reasons.join(', ')) : null,
            h('span', { class: 'push' }),
            h('button', { type: 'button', class: 'icon-btn', 'aria-label': '기록 지우기', onclick: () => mutateTaste((t) => removeEntry(t, e.id)) }, '×')),
          e.rating === 0
            ? h('p', { class: 'small' }, h('span', { class: 'muted' }, '전 '), e.before.replace(/\n/g, ' / '), h('br'), h('span', { class: 'muted' }, '후 '), e.after.replace(/\n/g, ' / '))
            : e.text ? h('p', { class: 'small' }, e.text.replace(/\n/g, ' / ')) : null)))
        : h('p', { class: 'empty card' }, '아직 기록이 없어요. 가사·편곡·멜로디를 AI로 만든 뒤 👍/👎를 눌러 보세요.')),
  );
}
