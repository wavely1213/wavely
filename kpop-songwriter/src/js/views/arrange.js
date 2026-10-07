// 편곡 탭: 빠르기·키, 섹션별 코드·에너지·악기·드럼·베이스. 음악 지식 없이 "느낌"으로 고른다.
import { h } from '../dom.js';
import { mutate as baseMutate, mutateSong as baseMutateSong, refresh } from '../state.js';

// 편곡 탭에서 바꾼 것은 진행 상황의 '편곡' 단계 완료로 친다
const arranged = (fn) => (x) => { fn(x); x.progress = { ...(x.progress || {}), arranged: true }; };
const mutate = (fn, scope) => baseMutate(arranged(fn), scope);
const mutateSong = (id, fn, scope) => baseMutateSong(id, arranged(fn), scope);
import { sectionLabels } from '../structure.js';
import { NOTE_NAMES, MODE_LABEL, PROGRESSIONS, DEGREE_FEEL, chordName, findProgression, tempoWord, keyName } from '../music/theory.js';
import { ARRANGE_INSTRUMENTS, INSTRUMENT_BY_ID } from '../music/instruments.js';
import { DRUM_PATTERNS, BASS_PATTERNS, DRUM_ROWS, cloneGrid } from '../music/patterns.js';
import { QUICK_TWEAKS } from '../music/arrangement.js';
import { arrangeSong } from '../ai-music.js';
import { isBusy, runJob, stopJob, job } from '../aijob.js';
import { playBar, playButton } from './playbar.js';
import { uid } from '../dom.js';
import { help } from '../help.js';
import { feedbackBar } from '../learn/feedback.js';

const memo = {};
const memoOf = (id) => (memo[id] = memo[id] || { request: '', summary: '', grids: {} });

export function renderArrange(song) {
  const m = memoOf(song.id);
  const labels = sectionLabels(song.sections);
  return h('div', { class: 'stack' },
    renderGlobal(song, m),
    h('div', { class: 'sections' }, song.sections.map((s, i) => renderSectionRow(song, s, labels[i], m))),
  );
}

function renderGlobal(song, m) {
  const mu = song.music;
  const busy = isBusy();
  const bpmOut = h('span', { class: 'mono' }, `${mu.bpm} BPM · ${tempoWord(mu.bpm)}`);
  const refs = song.references.filter((r) => r.use).length;
  return h('section', { class: 'card' },
    h('h2', null, '곡 전체'),
    playBar(song),
    h('div', { class: 'grid2' },
      h('div', { class: 'field' },
        h('span', { class: 'field-label' }, '빠르기 ', help('bpm')),
        h('input', { id: 'bpm', type: 'range', min: '60', max: '180', value: String(mu.bpm), oninput: (e) => {
          const v = Number(e.target.value);
          bpmOut.textContent = `${v} BPM · ${tempoWord(v)}`;
          mutate((s) => { s.music.bpm = v; }, 'quiet');
        }, onchange: () => refresh() }),
        bpmOut),
      h('div', { class: 'field' },
        h('span', { class: 'field-label' }, '키 (노래 높이와 분위기) ', help('key')),
        h('div', { class: 'row' },
          h('select', { id: 'root', 'aria-label': '으뜸음', onchange: (e) => mutate((s) => { s.music.root = Number(e.target.value); }) },
            NOTE_NAMES.map((n, i) => h('option', { value: String(i), selected: i === mu.root }, n))),
          ['major', 'minor'].map((md) => h('button', {
            type: 'button', class: `chip${mu.mode === md ? ' on' : ''}`, 'aria-pressed': mu.mode === md ? 'true' : 'false',
            onclick: () => mutate((s) => { s.music.mode = md; }),
          }, MODE_LABEL[md]))),
        h('span', { class: 'muted' }, '노래하기 편한 높이를 모르면 그대로 두고, 멜로디를 들어 보며 바꿔 보세요.'))),
    h('textarea', { id: 'arr-request', rows: '2', value: m.request, placeholder: '원하는 느낌을 말로 적어 주세요. 예: 코러스에서 확 터지게, 레트로 신스 느낌, 브릿지는 피아노만', oninput: (e) => { m.request = e.target.value; } }),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn primary', disabled: busy, onclick: () => runJob('편곡 초안 만드는 중', async (signal) => {
        const res = await arrangeSong(song, { request: m.request, signal });
        applyArrangement(song.id, res);
        m.summary = res.summary;
        m.gen = uid();
      }) }, 'AI가 곡 전체 편곡하기'),
      busy ? h('button', { type: 'button', class: 'btn ghost', onclick: stopJob }, '중지') : null,
      busy ? h('span', { class: 'status' }, h('span', { class: 'dot' }), job.label) : null,
      h('span', { class: 'muted push' }, refs ? `레퍼런스 ${refs}곡 반영` : '레퍼런스 탭에서 참고 곡을 넣으면 반영돼요')),
    m.summary ? h('p', { class: 'note' }, m.summary) : null,
    m.gen ? feedbackBar({ kind: 'arrange', ref: m.gen, text: m.summary, context: arrangeContext(song), label: 'AI 편곡이 마음에 드나요? (들어 보고 눌러 주세요)' }) : null,
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn', onclick: () => mutate((s) => applyToStyle(s)) }, '편곡을 Suno 스타일에 반영'),
      h('span', { class: 'muted' }, `현재 ${keyName(mu.root, mu.mode)} · 스타일 탭의 BPM·키·악기가 바뀌어요`)),
  );
}

// AI 결과는 요청한 곡에 넣는다 (그 사이 다른 곡을 열었어도)
function applyArrangement(songId, res) {
  mutateSong(songId, (s) => {
    if (res.bpm) s.music.bpm = res.bpm;
    if (res.root != null) s.music.root = res.root;
    if (res.mode) s.music.mode = res.mode;
    res.sections.forEach((x) => {
      const sm = s.music.sections[x.id];
      if (!sm) return;
      Object.assign(sm, { bars: x.bars, chords: x.chords, seventh: x.seventh, energy: x.energy, instruments: x.instruments, drum: x.drum, bass: x.bass, drumGrid: null });
    });
  });
}

function arrangeContext(song) {
  const inst = new Set();
  Object.values(song.music.sections).forEach((sm) => sm.instruments.forEach((i) => inst.add(i)));
  return { bpm: song.music.bpm, key: keyName(song.music.root, song.music.mode), instruments: [...inst], song: song.title };
}

export function applyToStyle(s) {
  const used = new Set();
  Object.values(s.music.sections).forEach((sm) => sm.instruments.forEach((i) => used.add(i)));
  s.style.bpm = s.music.bpm;
  s.style.key = keyName(s.music.root, s.music.mode);
  s.style.instruments = [...used].map((i) => INSTRUMENT_BY_ID[i]?.suno).filter(Boolean).join(', ');
}

function renderSectionRow(song, s, label, m) {
  const mu = song.music;
  const sm = mu.sections[s.id];
  const busy = isBusy();
  const set = (fn) => mutate((x) => fn(x.music.sections[s.id]));
  const prog = findProgression(mu.mode, sm.chords);

  const chordChips = sm.chords.map((d, ci) => h('select', {
    class: 'chord', id: `ch-${s.id}-${ci}`, 'aria-label': `${ci + 1}번째 코드`,
    onchange: (e) => set((x) => { x.chords[ci] = Number(e.target.value); }),
  }, [1, 2, 3, 4, 5, 6, 7].map((deg) => h('option', { value: String(deg), selected: deg === d },
    `${chordName(mu.root, mu.mode, deg, sm.seventh)} · ${DEGREE_FEEL[mu.mode][deg - 1]}`))));

  const energy = h('div', { class: 'energy', role: 'group', 'aria-label': '에너지' },
    [1, 2, 3, 4, 5].map((n) => h('button', {
      type: 'button', class: `e${n <= sm.energy ? ' on' : ''}`, 'aria-label': `에너지 ${n}`,
      onclick: () => set((x) => { x.energy = n; }),
    })));

  const instChips = h('div', { class: 'chips small' }, ARRANGE_INSTRUMENTS.map((inst) => {
    const on = sm.instruments.includes(inst.id);
    return h('button', { type: 'button', class: `chip${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false',
      onclick: () => set((x) => { x.instruments = on ? x.instruments.filter((i) => i !== inst.id) : [...x.instruments, inst.id]; }) }, inst.name);
  }));

  const gridOpen = !!m.grids[s.id];
  return h('article', { class: 'section sec-row', 'data-id': s.id },
    h('header', { class: 'section-head' },
      h('span', { class: 'tag mono' }, `[${label}]`),
      h('span', { class: 'bars' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': '마디 줄이기', onclick: () => set((x) => { x.bars = Math.max(1, x.bars - 1); }) }, '−'),
        h('span', { class: 'mono' }, `${sm.bars}마디`),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': '마디 늘리기', onclick: () => set((x) => { x.bars = Math.min(16, x.bars + 1); }) }, '+')),
      h('span', { class: 'push' }),
      h('span', { class: 'muted' }, '조용'), energy, h('span', { class: 'muted' }, '폭발'), help('energy'),
      playButton(song, { onlyIds: [s.id], label, text: '▶ 이 부분', cls: 'btn small' })),
    h('div', { class: 'arr-grid' },
      h('span', { class: 'field-label' }, '코드', help('chords')),
      h('div', { class: 'stack-tight' },
        h('div', { class: 'row' },
          h('select', { id: `prog-${s.id}`, 'aria-label': '코드 진행 느낌', onchange: (e) => {
            const p = PROGRESSIONS[mu.mode].find((x) => x.id === e.target.value);
            if (p) set((x) => { x.chords = [...p.degrees]; x.seventh = !!p.seventh; });
          } },
          !prog ? h('option', { value: '', selected: true }, '직접 고른 진행') : null,
          PROGRESSIONS[mu.mode].map((p) => h('option', { value: p.id, selected: prog?.id === p.id }, p.name))),
          h('label', { class: 'check' }, h('input', { type: 'checkbox', id: `sev-${s.id}`, checked: sm.seventh, onchange: (e) => set((x) => { x.seventh = e.target.checked; }) }), '세련되게 (7th)'), help('seventh')),
        h('div', { class: 'row' }, chordChips,
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': '코드 빼기', disabled: sm.chords.length <= 1, onclick: () => set((x) => { x.chords.pop(); }) }, '−'),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': '코드 더하기', disabled: sm.chords.length >= 8, onclick: () => set((x) => { x.chords.push(x.chords[0]); }) }, '+'))),
      h('span', { class: 'field-label' }, '악기'), instChips,
      h('span', { class: 'field-label' }, '리듬'),
      h('div', { class: 'row' },
        h('select', { id: `drum-${s.id}`, 'aria-label': '드럼 스타일', onchange: (e) => set((x) => { x.drum = e.target.value; x.drumGrid = null; }) },
          h('option', { value: 'none', selected: sm.drum === 'none' }, '드럼 없음'),
          Object.entries(DRUM_PATTERNS).map(([k, v]) => h('option', { value: k, selected: sm.drum === k && !sm.drumGrid }, v.name)),
          sm.drumGrid ? h('option', { value: sm.drum, selected: true }, '직접 찍은 드럼') : null),
        h('select', { id: `bass-${s.id}`, 'aria-label': '베이스 스타일', onchange: (e) => set((x) => { x.bass = e.target.value; }) },
          Object.entries(BASS_PATTERNS).map(([k, v]) => h('option', { value: k, selected: sm.bass === k }, `베이스: ${v.name}`))),
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => { m.grids[s.id] = !gridOpen; refresh(); } }, gridOpen ? '드럼 칸 닫기' : '드럼 직접 찍기')),
    ),
    gridOpen ? renderDrumGrid(sm, set) : null,
    h('div', { class: 'row' },
      Object.entries(QUICK_TWEAKS).map(([k, t]) => h('button', { type: 'button', class: 'btn small', onclick: () => set((x) => t.apply(x)) }, t.name)),
      h('button', { type: 'button', class: 'btn small ghost', disabled: busy, onclick: () => runJob(`${label} 편곡 중`, async (signal) => {
        const res = await arrangeSong(song, { targetIds: [s.id], request: m.request, signal });
        applyArrangement(song.id, res);
        m.summary = res.summary;
        m.gen = uid();
      }) }, 'AI로 이 부분 다시')),
  );
}

function renderDrumGrid(sm, set) {
  const base = sm.drumGrid || DRUM_PATTERNS[sm.drum]?.grid || DRUM_PATTERNS.pop.grid;
  return h('div', { class: 'drumgrid-wrap' },
    h('p', { class: 'muted' }, '한 마디(16칸)를 칸 단위로 찍어요. 4칸마다 한 박자예요. 이 섹션의 모든 마디에 반복돼요.'),
    h('div', { class: 'drumgrid' }, DRUM_ROWS.map((row) => [
      h('span', { class: 'dg-name' }, row.name),
      ...base[row.id].map((on, i) => h('button', {
        type: 'button', class: `dg${on ? ' on' : ''}${i % 4 === 0 ? ' beat' : ''}`, 'aria-label': `${row.name} ${i + 1}칸`, 'aria-pressed': on ? 'true' : 'false',
        onclick: () => set((x) => {
          const g = cloneGrid(x.drumGrid || DRUM_PATTERNS[x.drum]?.grid || DRUM_PATTERNS.pop.grid);
          g[row.id][i] = !g[row.id][i];
          x.drumGrid = g;
          if (x.drum === 'none') x.drum = 'pop';
          if (!x.instruments.includes('drums')) x.instruments.push('drums');
        }),
      })),
    ])));
}
