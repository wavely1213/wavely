// 구조·가사 > 섹션: 한 줄만 바꾸기. 줄을 고르고 AI 후보 3개 중 하나로 바꾼다 (고른 것·버린 것은 취향 기록의 선호 쌍으로).
import { h, toast } from '../dom.js';
import { mutateSong, mutateTaste, refresh, getState } from '../state.js';
import { isBusy, runJob } from '../aijob.js';
import { rewriteLine } from '../ai-line.js';
import { countSyllables } from '../lyrictools.js';
import { makeEntry, addEntry, removeEntry } from '../learn/taste.js';

// `곡 id:섹션 id` → { open, index, line, at(후보를 받은 줄 번호), options, picks } (화면 메모리에만).
// 곡 id까지 쓰는 건 가져온 곡이 원곡과 섹션 id가 같을 수 있어서.
const bySection = {};
const MAX_PICKS = 20;
const short = (l) => (l.length > 28 ? `${l.slice(0, 28)}…` : l);

// 후보를 받은 뒤 가사가 바뀌었을 수 있으니, 받은 줄을 지금 가사에서 다시 찾는다.
// 같은 줄이 여럿이면 받을 때 자리(at)에 가장 가까운 것 (없으면 -1)
function findLine(songId, sectionId, line, at) {
  const sec = getState().songs.find((x) => x.id === songId)?.sections.find((y) => y.id === sectionId);
  const rows = (sec?.text || '').split('\n');
  let best = -1;
  rows.forEach((r, i) => { if (r.trim() === line && (best < 0 || Math.abs(i - at) < Math.abs(best - at))) best = i; });
  return best;
}

// 되돌리기(↶)로 섹션 가사가 바꾸기 직전(before)과 똑같아지면 그 선택 기록을 지우고,
// 다시 하기(↷)로 바꾼 직후(after)와 똑같아지면 되살린다 — 지울 때 기록에 실제로 있던 것만 (사용자가 지운 기록은 그대로 둠).
// 다시 그릴 때마다 확인하고, 취향 저장은 그리기가 끝난 뒤에.
function syncPicks(s, st) {
  st.picks.forEach((p) => {
    if (!p.removed && s.text === p.before) {
      p.removed = true;
      queueMicrotask(() => mutateTaste((t) => { p.had = t.log.some((e) => e.id === p.entry.id); removeEntry(t, p.entry.id); }, 'quiet'));
    } else if (p.removed && s.text === p.after) {
      p.removed = false;
      if (p.had) queueMicrotask(() => mutateTaste((t) => addEntry(t, p.entry), 'quiet'));
    }
  });
}

const stateOf = (songId, sectionId) => {
  const key = `${songId}:${sectionId}`;
  return bySection[key] || (bySection[key] = { open: false, index: -1, line: '', at: -1, options: [], picks: [] });
};
const hasLines = (s) => s.text.split('\n').some((l) => l.trim());

// 섹션 버튼 줄에 놓는 여는 버튼 (열려 있거나 가사가 없으면 없음)
export function lineSwapButton(song, s) {
  const st = stateOf(song.id, s.id);
  syncPicks(s, st);
  if (st.open || !hasLines(s)) return null;
  return h('button', { type: 'button', class: 'btn small ghost', id: `ls-open-${s.id}`, onclick: () => { st.open = true; refresh(); document.getElementById(`ls-line-${s.id}`)?.focus(); } }, '한 줄만 바꾸기');
}

// 열었을 때 버튼 줄 아래에 놓는 패널
export function lineSwapPanel(song, s) {
  const st = stateOf(song.id, s.id);
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
    // line: true — 섹션 전체 예시가 아니라 "특히 좋다고 고른 줄"로 프롬프트에 들어가게
    const entry = makeEntry({ kind: 'lyrics', rating: 1, text: opt, context: { ref: `line:${s.id}:${Date.now()}`, song: song.title, section: s.type, line: true, rejected } });
    let before = '';
    let after = '';
    mutateSong(song.id, (x) => {
      const sec = x.sections.find((y) => y.id === s.id);
      before = sec.text;
      const rows = sec.text.split('\n');
      rows[j] = rows[j].replace(old, () => opt); // 줄 앞뒤 빈칸은 그대로
      sec.text = rows.join('\n');
      after = sec.text;
    });
    mutateTaste((t) => addEntry(t, entry));
    st.picks = [...st.picks, { entry, before, after, removed: false }].slice(-MAX_PICKS);
    st.options = [];
    st.index = j;
    toast('줄을 바꿨어요. ↶로 되돌릴 수 있고, 고른 것은 취향에 배워요');
    refresh();
    document.getElementById(`ls-line-${s.id}`)?.focus({ preventScroll: true }); // 누른 버튼이 사라지므로
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
      h('button', { type: 'button', class: 'btn small primary', id: `ls-pick-${s.id}-${k}`, 'aria-label': `이걸로: ${o}`, onclick: () => pick(o) }, '이걸로')))) : null);
}
