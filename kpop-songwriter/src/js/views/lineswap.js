// 구조·가사 > 섹션: 한 줄만 바꾸기. 줄을 고르고 AI 후보 3개 중 하나로 바꾼다 (고른 것·버린 것은 취향 기록의 선호 쌍으로).
import { h, toast } from '../dom.js';
import { mutateSong, mutateTaste, refresh, getState } from '../state.js';
import { isBusy, runJob } from '../aijob.js';
import { rewriteLine } from '../ai-line.js';
import { countSyllables } from '../lyrictools.js';
import { makeEntry, addEntry } from '../learn/taste.js';

const bySection = {}; // 섹션 id → { open, index, line, at(후보를 받은 줄 번호), options } (화면 메모리에만)
const short = (l) => (l.length > 28 ? `${l.slice(0, 28)}…` : l);

// 후보를 받은 뒤 가사가 바뀌었을 수 있으니, 받은 줄을 지금 가사에서 다시 찾는다 (없으면 -1)
function findLine(songId, sectionId, line, at) {
  const sec = getState().songs.find((x) => x.id === songId)?.sections.find((y) => y.id === sectionId);
  const rows = (sec?.text || '').split('\n');
  return rows[at]?.trim() === line ? at : rows.findIndex((r) => r.trim() === line);
}

const stateOf = (id) => bySection[id] || (bySection[id] = { open: false, index: -1, line: '', at: -1, options: [] });
const hasLines = (s) => s.text.split('\n').some((l) => l.trim());

// 섹션 버튼 줄에 놓는 여는 버튼 (열려 있거나 가사가 없으면 없음)
export function lineSwapButton(s) {
  const st = stateOf(s.id);
  if (st.open || !hasLines(s)) return null;
  return h('button', { type: 'button', class: 'btn small ghost', id: `ls-open-${s.id}`, onclick: () => { st.open = true; refresh(); document.getElementById(`ls-line-${s.id}`)?.focus(); } }, '한 줄만 바꾸기');
}

// 열었을 때 버튼 줄 아래에 놓는 패널
export function lineSwapPanel(song, s) {
  const st = stateOf(s.id);
  if (!st.open || !hasLines(s)) return null;
  const lines = s.text.split('\n');
  const filled = lines.map((l, i) => ({ l: l.trim(), i })).filter((x) => x.l);
  if (!lines[st.index]?.trim()) st.index = filled[0].i;
  const run = () => {
    const at = st.index;
    const line = lines[at].trim();
    runJob('한 줄 후보 쓰는 중', async (signal) => {
      st.options = await rewriteLine(song, s.id, at, { signal });
      st.line = line;
      st.at = at;
      if (!st.options.length) toast('후보를 받지 못했어요. 다시 눌러 주세요');
    });
  };
  const pick = (opt) => {
    const j = findLine(song.id, s.id, st.line, st.at);
    if (j < 0) { toast('그 줄이 그새 바뀌어서 넣지 않았어요. 후보를 다시 받아 주세요'); return; }
    const old = st.line;
    const rejected = [old, ...st.options.filter((o) => o !== opt)];
    mutateSong(song.id, (x) => {
      const sec = x.sections.find((y) => y.id === s.id);
      const rows = sec.text.split('\n');
      rows[j] = rows[j].replace(old, () => opt); // 줄 앞뒤 빈칸은 그대로
      sec.text = rows.join('\n');
    });
    mutateTaste((t) => addEntry(t, makeEntry({ kind: 'lyrics', rating: 1, text: opt, context: { ref: `line:${s.id}:${Date.now()}`, song: song.title, section: s.type, rejected } })));
    st.options = [];
    st.index = j;
    toast('줄을 바꿨어요. ↶로 되돌릴 수 있고, 고른 것은 취향에 배워요');
    refresh();
  };
  return h('div', { class: 'line-swap', id: `ls-${s.id}` },
    h('div', { class: 'row' },
      h('select', { id: `ls-line-${s.id}`, 'aria-label': '바꿀 줄', onchange: (e) => { st.index = Number(e.target.value); st.options = []; refresh(); } },
        filled.map(({ l, i }) => h('option', { value: String(i), selected: i === st.index }, short(l)))),
      h('button', { type: 'button', class: 'btn small', id: `ls-run-${s.id}`, disabled: isBusy(), onclick: run }, st.options.length ? '다른 후보' : '후보 3개 받기'),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => { st.open = false; st.options = []; refresh(); document.getElementById(`ls-open-${s.id}`)?.focus(); } }, '닫기')),
    st.options.length ? h('p', { class: 'muted small' }, `지금 줄: ${st.line} (${countSyllables(st.line)}음절)`) : null,
    st.options.length ? h('ul', { class: 'line-options' }, st.options.map((o, k) => h('li', { class: 'row' },
      h('span', { class: 'line-option' }, o),
      h('span', { class: 'mono muted small' }, `${countSyllables(o)}음절`),
      h('span', { class: 'push' }),
      h('button', { type: 'button', class: 'btn small primary', id: `ls-pick-${s.id}-${k}`, onclick: () => pick(o) }, '이걸로')))) : null);
}
