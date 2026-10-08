// 멜로디 탭: 피아노롤. 스케일 안의 음만 보여서 틀린 음을 고를 일이 없다.
// 빈 칸을 누르면 음표 추가, 음표를 누르면 선택 → 아래 버튼으로 옮기기·길이·가사 수정.
import { h } from '../dom.js';
import { mutate, mutateSong, refresh } from '../state.js';
import { sectionLabels, sungText } from '../structure.js';
import { degreeToMidi, NOTE_NAMES } from '../music/theory.js';
import { countSyllables, syllableTokens } from '../lyrictools.js';
import { writeMelody } from '../ai-music.js';
import { isBusy, runJob, stopJob, job } from '../aijob.js';
import { playButton } from './playbar.js';
import { uid } from '../dom.js';
import { feedbackBar, trackEdit, cancelEdit } from '../learn/feedback.js';
import { melodyText, melodyFeedbackText } from '../music/melodytext.js';
import { help } from '../help.js';
import { melodyPlan, applyCopies, repeatSource, fitCopy } from '../music/melodycopy.js';
import { sectionRange, outOfRange, foldIntoRange, midiName as rangeName } from '../music/range.js';

const TOP = 10;
const BOTTOM = -3;
const CELL_W = 22;
const CELL_H = 26;

// gen·origin·lastAfter는 곡+섹션으로 (가져온 곡은 섹션 id가 같을 수 있음)
const ui = { sectionId: '', selected: -1, confirmClear: false, confirmCopy: false, request: '', scroll: 0, gen: {}, origin: {}, lastAfter: {} };
const genKey = (songId, sectionId) => `${songId}:${sectionId}`;

function midiName(n) { return `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`; }

export function renderMelody(song) {
  bindMelodyKeys(() => song);
  const labels = sectionLabels(song.sections);
  if (!song.sections.some((s) => s.id === ui.sectionId)) {
    ui.sectionId = (song.sections.find((s) => song.music.sections[s.id]?.melody.length)
      || song.sections.find((s) => s.text.trim() && s.type !== 'Intro') || song.sections[0])?.id || '';
    ui.selected = -1;
  }
  const s = song.sections.find((x) => x.id === ui.sectionId);
  if (!s) return h('p', { class: 'empty card' }, '섹션이 없어요. 구조·가사 탭에서 섹션을 먼저 만들어 주세요.');
  const sm = song.music.sections[s.id];
  const label = labels[song.sections.indexOf(s)];
  const busy = isBusy();
  const idx = song.sections.indexOf(s);
  const plan = melodyPlan(song.sections); // 같은 가사를 다시 부르는 반복 섹션은 AI에 안 맡기고 첫 섹션 멜로디를 옮긴다
  const sung = sungText(song.sections, idx);
  const syl = sung.split('\n').filter((l) => l.trim()).reduce((a, l) => a + countSyllables(l), 0);
  const src = repeatSource(song, idx);
  // AI가 만든 멜로디를 고치면 (멈춘 지 4초 뒤) 전·후를 취향 기록에 남긴다.
  // 화면을 다시 그릴 때마다 부르므로 멜로디가 실제로 바뀐 때만, 원래대로 돌아가면(되돌리기) 기록을 지우고, 다 지우면 남기지 않는다.
  const gk = genKey(song.id, s.id);
  if (ui.origin[gk]) {
    const after = melodyText(sm.melody);
    if (after !== ui.lastAfter[gk]) {
      ui.lastAfter[gk] = after;
      if (after === ui.origin[gk] || !after) cancelEdit('melody', ui.gen[gk]);
      else trackEdit({ kind: 'melody', ref: ui.gen[gk], before: ui.origin[gk], after, context: { section: s.type, song: song.title } });
    }
  }

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, '멜로디 만들기'),
      h('p', { class: 'muted' }, '가사에 맞춰 AI가 멜로디 초안을 만들고, 마음에 안 드는 음만 손으로 고치세요. 가이드 멜로디는 WAV 데모에 들어가서 Suno에 올리면 그 멜로디를 따라 부르게 할 수 있어요.'),
      h('textarea', { id: 'mel-request', 'aria-label': 'AI 멜로디 요청', rows: '2', value: ui.request, placeholder: '원하는 멜로디 느낌 (선택) 예: 코러스 첫 줄은 높게 시작, 벌스는 랩하듯 낮게', oninput: (e) => { ui.request = e.target.value; } }),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn primary', disabled: busy, onclick: () => runJob(`${label} 멜로디 만드는 중`, async (signal) => {
          applyMelody(song.id, await writeMelody(song, { targetIds: [s.id], request: ui.request, signal }));
        }) }, `AI로 ${label} 멜로디`),
        h('button', { type: 'button', class: 'btn', disabled: busy || !plan.targets.length, onclick: () => runJob('전체 멜로디 만드는 중', async (signal) => {
          // 한 번에 너무 길면 끊기므로 섹션 3개씩 나눠 요청
          for (let i = 0; i < plan.targets.length; i += 3) {
            if (signal.aborted) break;
            applyMelody(song.id, await writeMelody(song, { targetIds: plan.targets.slice(i, i + 3), request: ui.request, signal }), plan);
          }
        }) }, '가사 있는 섹션 전부'),
        busy ? h('button', { type: 'button', class: 'btn ghost', onclick: stopJob }, '중지') : null,
        busy ? h('span', { class: 'status' }, h('span', { class: 'dot' }), job.label) : null)),
    h('div', { class: 'chips' }, song.sections.map((x, i) => h('button', {
      type: 'button', class: `chip${x.id === s.id ? ' on' : ''}`, 'aria-pressed': x.id === s.id ? 'true' : 'false',
      onclick: () => { ui.sectionId = x.id; ui.selected = -1; ui.confirmClear = false; ui.confirmCopy = false; ui.scroll = 0; refresh(); },
    }, `${labels[i]}${song.music.sections[x.id]?.melody.length ? ' ♪' : ''}`))),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, `[${label}] ${sm.bars}마디`),
        h('div', { class: 'row' },
          h('span', { class: `mono ${sm.melody.length && syl && Math.abs(sm.melody.length - syl) > Math.max(2, syl * 0.15) ? 'over' : 'muted'}`, id: 'mel-count', title: '음표 수와 가사 음절 수가 많이 다르면 가사가 바뀌었거나 멜로디가 덜 맞은 거예요' }, `음표 ${sm.melody.length} · 가사 음절 ${syl}`),
          src >= 0 ? copyButton(song, s, sm, labels[src], song.sections[src]) : null,
          sm.melody.length && syl ? h('button', { type: 'button', class: 'btn small', id: 'mel-fill-syl', title: '음표에 가사 음절을 앞에서부터 차례로 넣어요 (손으로 찍은 음표용)', onclick: () => mutate((x) => {
            const tokens = sungText(x.sections, x.sections.findIndex((y) => y.id === s.id)).split('\n').flatMap(syllableTokens);
            [...x.music.sections[s.id].melody].sort((a, b) => a.s - b.s).forEach((n, i) => { n.syl = tokens[i] || ''; });
          }) }, '가사 음절 넣기') : null,
          playButton(song, { onlyIds: [s.id], label, text: '▶ 이 부분 듣기', cls: 'btn small primary' }))),
      sung.trim() ? h('pre', { class: 'lyric-ref' }, sung.trim()) : null,
      renderRange(song, s, sm),
      renderRoll(song, s, sm),
      ui.gen[genKey(song.id, s.id)] ? feedbackBar({ kind: 'melody', ref: ui.gen[genKey(song.id, s.id)], text: melodyFeedbackText(label, sm.melody), context: { section: s.type, song: song.title, range: sm.melody.length ? [Math.min(...sm.melody.map((n) => n.d)), Math.max(...sm.melody.map((n) => n.d))] : null }, label: 'AI 멜로디가 마음에 드나요?' }) : null,
      renderNoteTools(song, s, sm),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn small', onclick: () => shiftAll(s.id, 1) }, '전체 한 음 올리기'),
        h('button', { type: 'button', class: 'btn small', onclick: () => shiftAll(s.id, -1) }, '전체 한 음 내리기'),
        ui.confirmClear
          ? [h('button', { type: 'button', class: 'btn small danger', onclick: () => { ui.confirmClear = false; ui.selected = -1; mutate((x) => { x.music.sections[s.id].melody = []; }); } }, '지우기 확인'),
            h('button', { type: 'button', class: 'btn small ghost', onclick: () => { ui.confirmClear = false; refresh(); } }, '취소')]
          : h('button', { type: 'button', class: 'btn small ghost', disabled: !sm.melody.length, onclick: () => { ui.confirmClear = true; refresh(); } }, '이 섹션 멜로디 지우기'))),
  );
}

function applyMelody(songId, out, plan = null) {
  out.forEach(({ id, notes }) => { const k = genKey(songId, id); ui.gen[k] = uid(); ui.origin[k] = melodyText(notes); ui.lastAfter[k] = ui.origin[k]; });
  mutateSong(songId, (x) => {
    out.forEach(({ id, notes }) => { if (x.music.sections[id]) x.music.sections[id].melody = notes; });
    // 옮겨 받은 섹션은 AI 초안이 아니므로, 예전 초안 기준으로 '고침'을 기록하지 않게 지운다
    if (plan) applyCopies(x, plan, out.map((m) => m.id)).forEach((id) => forgetGen(songId, id));
  });
}

function forgetGen(songId, id) {
  const k = genKey(songId, id);
  delete ui.gen[k];
  delete ui.origin[k];
  delete ui.lastAfter[k];
}

// 앞의 같은 가사 섹션 멜로디를 그대로 쓰기 (이미 음표가 있으면 한 번 더 확인)
function copyButton(song, s, sm, fromLabel, from) {
  const apply = () => {
    ui.confirmCopy = false;
    ui.selected = -1;
    forgetGen(song.id, s.id);
    mutate((x) => {
      const to = x.sections.find((y) => y.id === s.id);
      x.music.sections[s.id].melody = fitCopy(x, to, x.music.sections[from.id].melody);
    });
  };
  if (ui.confirmCopy) {
    return [h('button', { type: 'button', class: 'btn small danger', id: 'mel-copy-confirm', onclick: apply }, '바꾸기 확인'),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => { ui.confirmCopy = false; refresh(); } }, '취소')];
  }
  return h('button', {
    type: 'button', class: 'btn small', id: 'mel-copy',
    title: `${fromLabel}와 같은 가사라 멜로디를 그대로 가져와요. 마디 수가 다르면 잘리고, 부를 멤버 음역에 맞춰 옥타브를 옮겨요.`,
    onclick: () => { if (sm.melody.length) { ui.confirmCopy = true; refresh(); } else apply(); },
  }, `${fromLabel} 멜로디 그대로 쓰기`);
}

function shiftAll(id, d) {
  mutate((x) => { x.music.sections[id].melody.forEach((n) => { n.d = Math.max(BOTTOM, Math.min(TOP, n.d + d)); }); });
}

// 이 섹션을 부를 멤버의 음역과, 벗어난 음 고치기
function renderRange(song, s, sm) {
  const mu = song.music;
  const range = sectionRange(song, s);
  if (!range) return h('p', { class: 'muted small' }, s.members.length ? '랩 파트라 음역 제한이 없어요.' : '이 섹션을 부를 멤버를 구조·가사 탭에서 정하면 음역을 확인해 줘요.');
  const out = outOfRange(sm.melody, mu.root, mu.mode, range);
  return h('div', { class: 'row' },
    h('span', { class: 'muted small' }, `${range.names.join('·')} 음역 ${rangeName(range.low)}~${rangeName(range.high)} (흐린 줄은 음역 밖)`), help('range'),
    range.conflict ? h('span', { class: 'warn' }, '함께 부르는 멤버들의 음역이 겹치지 않아요. 파트를 나누는 걸 권해요.') : null,
    out.length ? h('span', { class: 'warn' }, `음역 밖 음 ${out.length}개`) : null,
    out.length && !range.conflict ? h('button', { type: 'button', class: 'btn small', onclick: () => mutate((x) => {
      const sec = x.music.sections[s.id];
      sec.melody = foldIntoRange(sec.melody, mu.root, mu.mode, range);
    }) }, '음역 안으로 옮기기') : null);
}

function renderRoll(song, s, sm) {
  const mu = song.music;
  const range = sectionRange(song, s);
  const out = new Set(outOfRange(sm.melody, mu.root, mu.mode, range));
  const steps = sm.bars * 16;
  const rows = TOP - BOTTOM + 1;
  // 마디마다 코드톤 줄을 연하게 칠한다 ("이 줄 음은 잘 어울려요")
  const shades = [];
  for (let bar = 0; bar < sm.bars; bar++) {
    const deg = sm.chords[bar % sm.chords.length] - 1;
    for (let d = BOTTOM; d <= TOP; d++) {
      const rel = (((d - deg) % 7) + 7) % 7;
      if (rel === 0 || rel === 2 || rel === 4) {
        shades.push(h('span', { class: `shade${rel === 0 ? ' root' : ''}`, style: `left:${bar * 16 * CELL_W}px;top:${(TOP - d) * CELL_H}px;width:${16 * CELL_W}px;height:${CELL_H}px` }));
      }
    }
  }
  if (range) {
    for (let d = BOTTOM; d <= TOP; d++) {
      const midi = degreeToMidi(mu.root, mu.mode, d);
      if (midi < range.low || midi > range.high) shades.push(h('span', { class: 'shade off', style: `left:0;top:${(TOP - d) * CELL_H}px;width:${steps * CELL_W}px;height:${CELL_H}px` }));
    }
  }
  const notes = sm.melody.map((n, i) => h('button', {
    type: 'button', class: `pr-note${i === ui.selected ? ' sel' : ''}${out.has(i) ? ' out' : ''}`,
    title: out.has(i) ? '부를 멤버의 음역 밖이에요' : null,
    style: `left:${n.s * CELL_W}px;top:${(TOP - n.d) * CELL_H + 2}px;width:${n.l * CELL_W - 2}px;height:${CELL_H - 4}px`,
    'aria-label': `${n.syl || '음표'} ${midiName(degreeToMidi(mu.root, mu.mode, n.d))}`,
    onclick: (e) => { e.stopPropagation(); ui.selected = i; refresh(); },
  }, n.syl || ''));

  const grid = h('div', {
    class: 'roll-grid',
    style: `width:${steps * CELL_W}px;height:${rows * CELL_H}px;--cw:${CELL_W}px;--ch:${CELL_H}px`,
    onclick: (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const st = Math.floor((e.clientX - r.left) / CELL_W);
      const d = TOP - Math.floor((e.clientY - r.top) / CELL_H);
      if (st < 0 || st >= steps || d < BOTTOM || d > TOP) return;
      mutate((x) => {
        const mel = x.music.sections[s.id].melody;
        const next = mel.filter((n) => n.s > st).sort((a, b) => a.s - b.s)[0];
        const covering = mel.find((n) => n.s <= st && n.s + n.l > st);
        if (covering) covering.l = st - covering.s || covering.l;
        if (covering && covering.s === st) return;
        const l = Math.min(2, (next ? next.s : steps) - st);
        mel.push({ s: st, l: Math.max(1, l), d, syl: '' });
        mel.sort((a, b) => a.s - b.s);
        ui.selected = mel.findIndex((n) => n.s === st);
      });
    },
  }, shades, notes, h('span', { class: 'playhead', id: 'roll-playhead', 'data-section': s.id, hidden: true }));

  const keys = h('div', { class: 'roll-keys' }, Array.from({ length: rows }, (_, k) => {
    const d = TOP - k;
    const midi = degreeToMidi(mu.root, mu.mode, d);
    return h('span', { class: `rk-key${((d % 7) + 7) % 7 === 0 ? ' tonic' : ''}`, style: `height:${CELL_H}px` }, midiName(midi));
  }));
  const barNums = h('div', { class: 'roll-bars', style: `width:${steps * CELL_W}px` },
    Array.from({ length: sm.bars }, (_, b) => h('span', { style: `width:${16 * CELL_W}px` }, `${b + 1}`)));
  const scroller = h('div', { class: 'roll-scroll', onscroll: (e) => { ui.scroll = e.target.scrollLeft; } }, barNums, grid);
  requestAnimationFrame(() => { scroller.scrollLeft = ui.scroll; });
  return h('div', { class: 'roll' }, keys, scroller);
}

function renderNoteTools(song, s, sm) {
  const n = sm.melody[ui.selected];
  if (!n) return h('p', { class: 'muted' }, '빈 칸을 누르면 음표가 생겨요. 음표를 누르면 옮기기·길이·가사를 바꿀 수 있어요 (키보드: ↑↓ 높이, ←→ 위치, +/- 길이, Delete 지우기). 색칠된 줄은 그 마디 코드와 잘 어울리는 음이에요.');
  const edit = (fn) => mutate((x) => {
    const mel = x.music.sections[s.id].melody;
    const note = mel[ui.selected];
    if (!note) return;
    fn(note, mel);
    const max = sm.bars * 16;
    note.s = Math.max(0, Math.min(max - 1, note.s));
    note.l = Math.max(1, Math.min(max - note.s, note.l));
    note.d = Math.max(BOTTOM, Math.min(TOP, note.d));
    mel.sort((a, b) => a.s - b.s);
    ui.selected = mel.indexOf(note);
  });
  return h('div', { class: 'note-tools' },
    h('span', { class: 'mono' }, `${midiName(degreeToMidi(song.music.root, song.music.mode, n.d))} · ${n.l}칸`),
    h('button', { type: 'button', class: 'btn small', onclick: () => edit((x) => { x.d += 1; }) }, '▲ 높게'),
    h('button', { type: 'button', class: 'btn small', onclick: () => edit((x) => { x.d -= 1; }) }, '▼ 낮게'),
    h('button', { type: 'button', class: 'btn small', onclick: () => edit((x) => { x.s -= 1; }) }, '◀ 앞으로'),
    h('button', { type: 'button', class: 'btn small', onclick: () => edit((x) => { x.s += 1; }) }, '▶ 뒤로'),
    h('button', { type: 'button', class: 'btn small', onclick: () => edit((x) => { x.l += 1; }) }, '길게'),
    h('button', { type: 'button', class: 'btn small', onclick: () => edit((x) => { x.l -= 1; }) }, '짧게'),
    h('input', { id: 'note-syl', class: 'syl-input', value: n.syl, 'aria-label': '이 음표의 가사 음절', placeholder: '가사', maxlength: '8',
      oninput: (e) => mutate((x) => { const note = x.music.sections[s.id].melody[ui.selected]; if (note) note.syl = e.target.value; }, 'quiet'),
      onchange: () => refresh() }),
    h('button', { type: 'button', class: 'btn small danger', onclick: () => { mutate((x) => { x.music.sections[s.id].melody.splice(ui.selected, 1); }); ui.selected = -1; refresh(); } }, '삭제'),
  );
}

// 키보드로 음표 고치기: 음표를 고른 뒤 ↑↓ 높이, ←→ 위치, +/- 길이, Delete 지우기, Esc 선택 해제
let keysBound = false;
let currentSong = null;
export function bindMelodyKeys(getSong) {
  currentSong = getSong;
  if (keysBound) return;
  keysBound = true;
  document.addEventListener('keydown', (e) => {
    const song = currentSong?.();
    if (!song || ui.selected < 0 || !document.querySelector('.roll-grid')) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    const sm = song.music.sections[ui.sectionId];
    if (!sm?.melody[ui.selected]) return;
    const moves = { ArrowUp: ['d', 1], ArrowDown: ['d', -1], ArrowLeft: ['s', -1], ArrowRight: ['s', 1], '+': ['l', 1], '=': ['l', 1], '-': ['l', -1] };
    if (e.key === 'Escape') { ui.selected = -1; refresh(); e.preventDefault(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      mutate((x) => { x.music.sections[ui.sectionId].melody.splice(ui.selected, 1); });
      ui.selected = -1;
      refresh();
      return;
    }
    const mv = moves[e.key];
    if (!mv) return;
    e.preventDefault();
    mutate((x) => {
      const mel = x.music.sections[ui.sectionId].melody;
      const note = mel[ui.selected];
      const max = x.music.sections[ui.sectionId].bars * 16;
      note[mv[0]] += mv[1];
      note.s = Math.max(0, Math.min(max - 1, note.s));
      note.l = Math.max(1, Math.min(max - note.s, note.l));
      note.d = Math.max(BOTTOM, Math.min(TOP, note.d));
      mel.sort((a, b) => a.s - b.s);
      ui.selected = mel.indexOf(note);
    });
  });
}
