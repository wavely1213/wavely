// 마스터링 탭: Suno 완성곡(또는 앱 데모)을 발매 규격(음량·트루 피크·44.1kHz)으로 맞춰 WAV로 받는다.
import { h, toast } from '../dom.js';
import { mutate, mutateSong, refresh } from '../state.js';
import { decodeFile, master, masterWarnings, MASTER_PRESETS, LOUDNESS_TARGETS, OUTPUT_RATE, presetOf, measureAsync } from '../music/master.js';
import { referenceTone, matchEq } from '../music/tonematch.js';
import { toneOf } from '../music/analyze.js';
import { renderSong, stop as stopPlayer } from '../music/player.js';
import { encodeWav, zip } from '../music/pack.js';
import { saveFile } from '../platform/download.js';
import { help } from '../help.js';
import { analyzeAudio } from '../music/analyze.js';
import { compareTake } from '../music/takes.js';
import { variantFromName } from '../variants.js';
import { bestWindow, cutClip } from '../music/highlight.js';
import { stereoCorrelation, clippedRuns, CLIP_WARN } from '../music/qc.js';
import { uid } from '../dom.js';
import { getState, newAlbum } from '../state.js';
import { setMaster, setSongMaster } from '../album/session.js';
import { mmss, parseMmss } from '../timefmt.js';
import { renderLyricCheck } from './lyriccheck.js';

// 오디오 버퍼는 커서 저장하지 않고 화면 메모리에만 둔다. 곡마다 따로 (다른 곡 결과가 섞이지 않게).
const byId = {};
let ui = null;
function uiFor(songId) {
  if (!byId[songId]) byId[songId] = { source: null, sourceName: '', result: null, busy: '', bits: 24, listen: null, matched: true, linked: 0, endAt: 0, playAt: 0 };
  // 다른 곡의 원본·결과 오디오(4분 곡이면 수백 MB)는 놓아 준다. 발매용 WAV는 setSongMaster로 따로 남아 있다.
  Object.entries(byId).forEach(([id, u]) => {
    if (id !== songId && !u.busy) { u.source = null; u.result = null; u.hl = null; u.listen = null; }
  });
  return byId[songId];
}

// 다른 탭·곡으로 가면 원본/마스터 미리듣기를 멈춘다 (app.js가 부름)
export function stopMasterPreview() {
  try { playing?.stop(); } catch { /* 이미 멈춤 */ }
  playing = null;
  Object.values(byId).forEach((u) => { u.listen = null; });
}
let audioCtx = null;
let playing = null;

function settings(song) {
  return { preset: 'kpop', target: -14, trim: true, fadeOut: 0, soften: false, ...(song.master || {}) };
}

function stopListen() {
  try { playing?.stop(); } catch { /* 이미 멈춤 */ }
  playing = null;
  ui.listen = null;
}

// fadeOut: 끝 부분 듣기('end')에서 미리 들려줄 끝 페이드 길이(초)
function listen(which, fadeOut = 0) {
  stopPlayer();
  if (ui.listen === which) { stopListen(); refresh(); return; }
  stopListen();
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const r = ui.result;
  let buffer;
  let offset = 0;
  let dur;
  if (which === 'before' || which === 'end') {
    buffer = ui.source;
    // 끝 부분 듣기: 자를 곳 8초 전부터 자를 곳까지 (끝 페이드도 미리 들려줌)
    if (which === 'end') { offset = Math.max(0, ui.endAt - 8); dur = ui.endAt - offset; }
  } else if (which === 'hl') {
    const c = highlightOf(r).clip;
    buffer = audioCtx.createBuffer(2, c[0].length, r.rate);
    c.forEach((x, i) => buffer.copyToChannel(x, i));
  } else {
    buffer = audioCtx.createBuffer(2, r.channels[0].length, r.rate);
    r.channels.forEach((c, i) => buffer.copyToChannel(c, i));
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const g = audioCtx.createGain();
  // 음량 맞춰 비교: 큰 쪽을 줄여 같은 크기로 듣는다 (커서 좋게 들리는 착각 방지)
  if (r && ui.matched && which !== 'hl' && which !== 'end' && Number.isFinite(r.before.lufs)) {
    const diff = r.after.lufs - r.before.lufs;
    g.gain.value = which === 'after' ? Math.min(1, 10 ** (-diff / 20)) : Math.min(1, 10 ** (diff / 20));
  }
  const fade = which === 'end' ? Math.min(dur, Math.max(fadeOut, 0.05)) : 0;
  if (fade) {
    const t = audioCtx.currentTime + dur;
    g.gain.setValueAtTime(g.gain.value, t - fade);
    g.gain.linearRampToValueAtTime(0, t);
  }
  src.connect(g).connect(audioCtx.destination);
  src.onended = () => { if (playing === src) { playing = null; ui.listen = null; refresh(); } };
  if (dur === undefined) src.start(0, offset); else src.start(0, offset, dur);
  ui.playAt = audioCtx.currentTime - offset; // "여기서 끝내기"가 지금 위치를 계산할 기준
  playing = src;
  ui.listen = which;
  refresh();
}

async function loadFile(f, songId) {
  const ui = uiFor(songId);
  stopListen();
  ui.busy = '파일 읽는 중';
  ui.result = null; ui.hl = null;
  refresh();
  try {
    ui.source = await decodeFile(f);
    ui.sourceName = f.name.replace(/\.[^.]+$/, '');
    ui.endAt = 0; // 곡 끝 자르기는 원본마다 다르다
  } catch {
    toast('이 파일은 읽지 못했어요. WAV나 MP3로 다시 시도해 주세요');
  } finally {
    ui.busy = '';
    refresh();
  }
}

async function loadDemo(song) {
  const ui = uiFor(song.id);
  stopListen();
  ui.busy = '앱 데모 녹음 중';
  ui.result = null; ui.hl = null;
  refresh();
  try {
    ui.source = await renderSong(song);
    ui.endAt = 0;
    ui.sourceName = `${song.title.replace(/^예시:\s*/, '')} (앱 데모)`;
  } catch {
    toast('데모를 만들지 못했어요');
  } finally {
    ui.busy = '';
    refresh();
  }
}

async function run(song) {
  const ui = uiFor(song.id);
  stopListen();
  const st = settings(song);
  ui.result = null; ui.hl = null;
  ui.busy = '준비 중';
  refresh();
  try {
    ui.result = await master(ui.source, { ...st, endAt: ui.endAt }, (t) => {
      ui.busy = t;
      const el = document.getElementById('master-status');
      if (el) el.textContent = t;
    });
    // 발매 전 점검: 원본의 하드 클리핑, 결과의 좌우 위상 상관
    const keep = ui.result.cutAt ? Math.round(ui.result.cutAt * ui.source.sampleRate) : ui.source.length;
    const src = Array.from({ length: ui.source.numberOfChannels }, (_, i) => ui.source.getChannelData(i).subarray(0, keep));
    ui.result.qc = { clips: clippedRuns(src), corr: stereoCorrelation(ui.result.channels[0], ui.result.channels[1]) };
    ui.result.target = st.target;
    ui.result.settings = { ...st, endAt: ui.result.cutAt }; // 받기·보고서는 실제로 마스터링한 설정으로
    mutateSong(song.id, (x) => { x.progress = { ...(x.progress || {}), mastered: true }; }, 'quiet');
  } catch {
    toast('마스터링 중 문제가 생겼어요. 다른 파일로 시도해 주세요');
  } finally {
    ui.busy = '';
    refresh();
  }
}

async function download(song) {
  const ui = uiFor(song.id);
  const r = ui.result;
  const st = r.settings || settings(song);
  const base = (ui.sourceName || 'master').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'master';
  const wavName = `${base}_master_${Math.abs(st.target)}LUFS_${ui.bits}bit.wav`;
  ui.busy = 'WAV 만드는 중';
  refresh();
  try {
    const wav = encodeWav({ channels: r.channels, sampleRate: r.rate }, { bits: ui.bits, normalize: false });
    const report = [
      `원본: ${ui.sourceName}`,
      `프리셋: ${presetOf(st).name}${st.preset === 'ref' && st.eqNote ? ` (${st.eqNote})` : ''}${st.soften ? ' + 거친 고음 부드럽게(6.5kHz -2.5dB)' : ''}`,
      `목표 음량: ${st.target} LUFS / 트루 피크 한도: -1 dBTP`,
      `결과: ${r.after.lufs.toFixed(1)} LUFS, ${r.after.peak.toFixed(1)} dBTP, ${OUTPUT_RATE} Hz ${ui.bits}bit 스테레오 WAV`,
      `원본 측정: ${Number.isFinite(r.before.lufs) ? r.before.lufs.toFixed(1) : '무음'} LUFS, ${r.before.peak.toFixed(1)} dBTP`,
      `리미터 최대 감소: ${r.maxReduction.toFixed(1)} dB`,
      ...(r.cutAt ? [`곡 끝: 원본 ${mmss(r.cutAt, { tenths: true })}에서 자름${st.fadeOut ? ` (끝 페이드 ${st.fadeOut}초)` : ''}`] : []),
      ...(r.qc ? [`원본 잘린 파형: ${r.qc.clips}곳 / 스테레오 상관: ${r.qc.corr.toFixed(2)} (1=모노, 0 아래=위상 반대)`] : []),
      '',
      ...masterWarnings(r, st.target),
      '',
      '유통사 제출 전: 앞뒤 무음 길이, 곡 끝이 잘리지 않았는지 직접 들어 확인하세요.',
    ].join('\n');
    const blob = zip([{ name: wavName, data: wav }, { name: 'mastering_report.txt', data: report }]);
    ui.busy = '저장 확인 창을 확인해 주세요';
    refresh();
    const res = await saveFile(`${base}_master.zip`, blob);
    if (res === 'saved') toast('받았어요');
    else if (res === 'unavailable') toast('이 화면에서는 파일을 받을 수 없어요');
  } catch {
    toast('파일을 만들지 못했어요. 다시 눌러 주세요');
  } finally {
    ui.busy = '';
    refresh();
  }
}

const fmt = (v, unit) => (Number.isFinite(v) ? `${v.toFixed(1)} ${unit}` : '—');

// 마스터 결과를 WAV로 만들어 이 곡이 들어 있는 모든 앨범 트랙에 연결한다
async function useInAlbums(song) {
  const r = ui.result;
  const wav = encodeWav({ channels: r.channels, sampleRate: r.rate }, { bits: ui.bits, normalize: false });
  const name = `${(song.title || 'master').replace(/^예시:\s*/, '').replace(/[\\/:*?"<>|]+/g, '').trim()}_master.wav`;
  const info = { file: new File([wav], name, { type: 'audio/wav' }), name, sampleRate: r.rate, bits: ui.bits, format: 1, channels: 2, lufs: r.after.lufs, peak: r.after.peak, duration: r.channels[0].length / r.rate, fromTab: true };
  setSongMaster(song.id, info);
  const albums = getState().albums.filter((a) => a.tracks.some((t) => t.songId === song.id));
  albums.forEach((a) => { setMaster(a.id, song.id, info); });
  ui.linked = albums.length;
  return albums.length;
}

// ---------- 레퍼런스 음색 맞추기 ----------
async function matchReference(song) {
  const ui = uiFor(song.id);
  const ref = referenceTone(song);
  if (!ui.source || !ref) return;
  ui.busy = '원본 음색 재는 중';
  refresh();
  try {
    const src = await toneOf(ui.source);
    const m = matchEq(src, ref);
    mutateSong(song.id, (x) => { x.master = { ...settings(x), preset: 'ref', eq: m.eq, eqNote: m.note }; });
  } catch {
    toast('음색을 재지 못했어요. 다시 눌러 주세요');
  } finally {
    ui.busy = '';
    refresh();
  }
}

function renderToneMatch(song, st) {
  const ref = referenceTone(song);
  if (!ref) return h('span', { class: 'muted small' }, '레퍼런스 탭에서 곡 파일을 분석해 두면, 그 곡의 저음·고음 균형에 맞춘 설정을 추천해요.');
  return h('div', { class: 'row' },
    h('button', { type: 'button', class: 'btn small wrap', id: 'tone-match', disabled: !ui.source || !!ui.busy, onclick: () => matchReference(song) },
      `레퍼런스(${ref.names.slice(0, 2).join(', ')}${ref.n > 2 ? ` 외 ${ref.n - 2}` : ''})에 음색 맞추기`),
    !ui.source ? h('span', { class: 'muted small' }, '완성곡을 먼저 넣어 주세요') : null,
    st.preset === 'ref' && st.eqNote ? h('span', { class: 'muted small', id: 'tone-note' }, st.eqNote) : null);
}

// ---------- Suno 테이크 비교 ----------
// 곡마다 테이크 목록 (파일과 분석값만; 오디오는 들을 때만 풀어서 재생)
const takesBy = {};

async function addTakes(song, files) {
  const list = takesBy[song.id] || (takesBy[song.id] = []);
  for (const f of [...files].slice(0, 6 - list.length)) {
    const t = { id: uid(), file: f, name: f.name.replace(/\.[^.]+$/, ''), variant: variantFromName(f.name, song), analysis: null, cmp: null, error: false };
    list.push(t);
    refresh();
    try {
      t.analysis = await analyzeAudio(f);
      t.cmp = compareTake(t.analysis, song);
    } catch {
      t.error = true;
    }
    refresh();
  }
}

async function playTake(t) {
  stopPlayer();
  if (ui.listen === `take:${t.id}`) { stopListen(); refresh(); return; }
  stopListen();
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  ui.listen = `take:${t.id}`;
  refresh();
  try {
    const buf = await audioCtx.decodeAudioData(await t.file.arrayBuffer());
    // 처음 들을 때 음량을 재 두고, 같은 음량(-14 LUFS 기준)으로 줄여서 들려준다 (큰 테이크가 좋게 들리는 착각 방지)
    if (t.lufs === undefined) {
      const chs = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
      t.lufs = (await measureAsync(chs.length > 1 ? chs : [chs[0], chs[0]], buf.sampleRate).catch(() => ({ lufs: null }))).lufs;
      if (!Number.isFinite(t.lufs)) t.lufs = null;
      refresh(); // 카드에 음량 표시
    }
    if (ui.listen !== `take:${t.id}`) return;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const g = audioCtx.createGain();
    // 기준: -14 LUFS와 지금까지 잰 테이크 중 가장 작은 것 중 더 작은 쪽 (크게 키우지 않고 줄여서 맞춤)
    const measured = (Object.values(takesBy).find((l) => l.includes(t)) || []).map((x) => x.lufs).filter((v) => Number.isFinite(v));
    const ref = Math.min(-14, ...measured);
    g.gain.value = ui.matched && t.lufs != null ? Math.min(1, 10 ** ((ref - t.lufs) / 20)) : 1;
    src.connect(g).connect(audioCtx.destination);
    src.onended = () => { if (playing === src) { playing = null; ui.listen = null; refresh(); } };
    src.start();
    playing = src;
  } catch {
    ui.listen = null;
    toast('이 파일은 재생하지 못했어요');
    refresh();
  }
}

function renderTakes(song) {
  const list = takesBy[song.id] || [];
  const files = h('input', { type: 'file', id: 'take-files', accept: 'audio/*', multiple: true, class: 'visually-hidden', onchange: (e) => {
    const fs = [...(e.target.files || [])]; // value를 비우면 FileList도 비므로 먼저 복사
    e.target.value = '';
    if (fs?.length) addTakes(song, fs);
  } });
  const best = Math.max(-1, ...list.filter((t) => t.cmp).map((t) => t.cmp.score));
  const vids = (song.styleVariants?.items || []).map((v) => v.id);
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, 'Suno 테이크 비교 (선택)'),
      h('span', { class: 'row' }, files, h('label', { for: 'take-files', class: 'btn small' }, '테이크 여러 개 넣기'))),
    h('p', { class: 'muted' }, 'Suno가 만든 여러 버전을 한꺼번에 넣으면, 편곡에서 정한 BPM·키·길이와 맞는지 비교해요. 들어 보고 마음에 드는 걸 "이걸로 마스터링"하세요. (최대 6개)'),
    list.length ? h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'take-matched', checked: ui.matched, onchange: (e) => { ui.matched = e.target.checked; refresh(); } }), '같은 음량으로 듣기 (큰 테이크가 더 좋게 들리는 착각 방지)') : null,
    list.length ? h('ul', { class: 'takes' }, list.map((t) => h('li', { class: `take${t.cmp && t.cmp.score === best && best > 0 ? ' best' : ''}` },
      h('div', { class: 'take-head' },
        h('strong', { class: 'track-title' }, t.name),
        vids.length ? h('select', { class: 'take-variant', 'aria-label': `${t.name} 스타일`, onchange: (e) => { t.variant = e.target.value; refresh(); } },
          h('option', { value: '', selected: !t.variant }, '스타일 ?'),
          vids.map((id) => h('option', { value: id, selected: t.variant === id }, `스타일 ${id}`))) : null,
        t.cmp ? h('span', { class: `pill ${t.cmp.score === 3 ? 'good' : t.cmp.score >= 2 ? '' : 'warn-pill'}` }, `편곡과 일치 ${t.cmp.score}/3`) : null,
        t.lufs != null && t.lufs !== undefined ? h('span', { class: 'mono muted small take-lufs' }, `${t.lufs.toFixed(1)} LUFS`) : null,
        t.cmp && t.cmp.score === best && best > 0 && list.length > 1 ? h('span', { class: 'pill good' }, '가장 가까움') : null,
        !t.analysis && !t.error ? h('span', { class: 'status' }, h('span', { class: 'dot' }), '분석 중') : null,
        t.error ? h('span', { class: 'warn' }, '읽지 못한 파일') : null,
        h('span', { class: 'push' }),
        h('button', { type: 'button', class: 'btn small', disabled: t.error, onclick: () => playTake(t) }, ui.listen === `take:${t.id}` ? '■ 정지' : '▶ 듣기'),
        h('button', { type: 'button', class: 'btn small primary', disabled: t.error || !!ui.busy, onclick: () => loadFile(t.file, song.id) }, '이걸로 마스터링'),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': '테이크 빼기', onclick: () => { const arr = takesBy[song.id]; arr.splice(arr.indexOf(t), 1); refresh(); } }, '×')), // 같은 배열에서 빼야 분석 중인 나머지가 남음
      t.cmp ? h('p', { class: 'muted small' }, t.cmp.notes.join(' · ')) : null)))
      : null);
}

export function renderMaster(song) {
  ui = uiFor(song.id);
  const st = settings(song);
  const r = ui.result;
  const busy = !!ui.busy;
  const file = h('input', { type: 'file', id: 'master-file', accept: 'audio/*', class: 'visually-hidden', onchange: (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) loadFile(f, song.id);
  } });
  const targetNote = LOUDNESS_TARGETS.find((t) => t.value === st.target)?.note;

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, '마스터링 (발매용 음원 만들기)'),
      h('p', { class: 'muted' }, 'Suno에서 받은 완성곡을 넣으면 음색을 다듬고, 스트리밍 기준 음량과 피크 한도에 맞춘 44.1kHz WAV로 만들어요. 파일은 이 브라우저 안에서만 처리하고 어디에도 올리지 않아요. Suno에서는 가능하면 WAV로 받아 오세요.'),
      h('div', { class: 'row' },
        file,
        h('label', { for: 'master-file', class: `btn primary${busy ? ' disabled' : ''}` }, '완성곡 파일 넣기 (WAV·MP3)'),
        h('button', { type: 'button', class: 'btn', disabled: busy, onclick: () => loadDemo(song) }, '앱 데모로 해 보기'),
        ui.source ? h('span', { class: 'muted' }, `${ui.sourceName} · ${Math.round(ui.source.duration)}초 · ${ui.source.sampleRate}Hz`) : null)),
    renderTakes(song),
    h('section', { class: 'card' },
      h('h2', null, '설정'),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '음색'),
        h('div', { class: 'chips' }, Object.entries(MASTER_PRESETS).map(([k, p]) => h('button', {
          type: 'button', class: `chip${st.preset === k ? ' on' : ''}`, 'aria-pressed': st.preset === k ? 'true' : 'false',
          onclick: () => mutate((s) => { s.master = { ...settings(s), preset: k }; }),
        }, p.name)),
        st.eq ? h('button', {
          type: 'button', class: `chip${st.preset === 'ref' ? ' on' : ''}`, 'aria-pressed': st.preset === 'ref' ? 'true' : 'false',
          onclick: () => mutate((s) => { s.master = { ...settings(s), preset: 'ref' }; }),
        }, '레퍼런스에 맞춤') : null),
        renderToneMatch(song, st)),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '목표 음량 ', help('lufs'), help('dbtp')),
        h('div', { class: 'chips' }, LOUDNESS_TARGETS.map((t) => h('button', {
          type: 'button', class: `chip${st.target === t.value ? ' on' : ''}`, 'aria-pressed': st.target === t.value ? 'true' : 'false',
          onclick: () => mutate((s) => { s.master = { ...settings(s), target: t.value }; }),
        }, t.name))),
        targetNote ? h('span', { class: 'muted' }, targetNote) : null),
      h('div', { class: 'row' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'master-trim', checked: st.trim, onchange: (e) => mutate((s) => { s.master = { ...settings(s), trim: e.target.checked }; }) }), '앞뒤 무음 정리'),
        h('label', { class: 'check', title: 'Suno 결과에 흔한 쇳소리·치찰음(6~7kHz)을 살짝 줄여요. 귀가 따가우면 켜 보세요.' }, h('input', { type: 'checkbox', id: 'master-soften', checked: st.soften, onchange: (e) => mutate((s) => { s.master = { ...settings(s), soften: e.target.checked }; }) }), '거친 고음 부드럽게'),
        h('label', { class: 'check' }, '끝 페이드 아웃',
          h('select', { id: 'master-fade', onchange: (e) => mutate((s) => { s.master = { ...settings(s), fadeOut: Number(e.target.value) }; }) },
            [[0, '없음'], [2, '2초'], [4, '4초'], [8, '8초']].map(([v, t]) => h('option', { value: String(v), selected: st.fadeOut === v }, t))))),
      renderEndCut(st),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn primary', disabled: busy || !ui.source, onclick: () => run(song) }, '마스터링 하기'),
        busy ? h('span', { class: 'status' }, h('span', { class: 'dot' }), h('span', { id: 'master-status' }, ui.busy)) : null,
        !ui.source && !busy ? h('span', { class: 'muted' }, '먼저 파일을 넣어 주세요') : null)),
    r ? renderResult(song, r) : null,
    renderLyricCheck(song),
  );
}

// 곡 끝 자르기: Suno가 끝을 늘이거나 이상하게 끝내면 원본을 들으며 끝낼 곳을 고른다 (원본마다 따로, 화면 메모리에만)
// t(초)를 자를 곳으로 정한다. 0.1초 아래는 버려 원본 길이를 넘지 않게. 못 쓰는 값이면 안내하고 false.
function setEnd(t) {
  if (Number.isNaN(t)) { toast('분:초나 초로 적어 주세요 (예: 3:25 또는 205)'); return false; }
  const at = Math.floor(t * 10) / 10;
  if (at && at >= ui.source.duration) { toast(`원본 길이(${mmss(ui.source.duration)})보다 짧게 적어 주세요`); return false; }
  ui.endAt = at;
  return true;
}

const endValue = () => (ui.endAt ? mmss(ui.endAt, { tenths: true }) : '');
const endNote = (st) => (ui.endAt
  ? `원본 ${mmss(ui.source.duration)} 중 ${mmss(ui.endAt, { tenths: true })}에서 끝내요${st.fadeOut ? ` (끝 ${st.fadeOut}초 페이드)` : ' — 끝 페이드 아웃(2~4초)을 함께 쓰면 자연스러워요'}. "끝 부분 듣기"로 확인하세요.`
  : 'Suno 곡 끝이 늘어지거나 이상하게 끝나면, 원본을 들으며 끝낼 곳에서 "여기서 끝내기"를 누르거나 분:초로 적으세요.');

// 칸에 적은 값은 화면 전체를 다시 그리지 않고 이 부분만 고친다
// (칸을 벗어나며 바로 다른 버튼을 누를 때, 다시 그리면 그 클릭이 사라진다)
function applyEndInput(input, st) {
  if (setEnd(parseMmss(input.value)) && ui.listen === 'end') {
    stopListen(); // 자를 곳이 바뀌면 듣던 끝 부분은 멈춘다
    const b = document.getElementById('end-listen');
    if (b) { b.textContent = '▶ 끝 부분 듣기'; b.classList.remove('primary'); }
  }
  input.value = endValue();
  const note = document.getElementById('end-note');
  if (note) note.textContent = endNote(st);
  ['end-listen', 'end-clear'].forEach((id) => { const b = document.getElementById(id); if (b) b.disabled = !ui.endAt; });
}

// 누른 버튼이 사라지는 경우 키보드 포커스를 자를 곳 칸으로
const focusEndInput = () => document.getElementById('master-end')?.focus({ preventScroll: true });

function renderEndCut(st) {
  if (!ui.source) return null;
  const hearing = ui.listen === 'before';
  const here = () => {
    const t = (audioCtx?.currentTime ?? 0) - ui.playAt;
    stopListen();
    setEnd(Math.max(0.1, Math.min(t, ui.source.duration - 0.1)));
    refresh();
    focusEndInput();
  };
  return h('div', { class: 'field', id: 'end-cut' },
    h('span', { class: 'field-label' }, '곡 끝 자르기'),
    h('div', { class: 'row' },
      h('input', { type: 'text', id: 'master-end', class: 'mono end-input', placeholder: '끝까지', 'aria-label': '곡 끝 시각 (분:초 또는 초)', value: endValue(), onchange: (e) => applyEndInput(e.target, st) }),
      h('button', { type: 'button', class: `btn small${hearing ? ' primary' : ''}`, id: 'end-src', onclick: () => listen('before') }, hearing ? '■ 원본 정지' : '▶ 원본 듣기'),
      hearing ? h('button', { type: 'button', class: 'btn small primary', id: 'end-here', onclick: here }, '여기서 끝내기') : null,
      h('button', { type: 'button', class: `btn small${ui.listen === 'end' ? ' primary' : ''}`, id: 'end-listen', disabled: !ui.endAt, onclick: () => listen('end', st.fadeOut) }, ui.listen === 'end' ? '■ 정지' : '▶ 끝 부분 듣기'),
      h('button', { type: 'button', class: 'btn small ghost', id: 'end-clear', disabled: !ui.endAt, onclick: () => { if (ui.listen === 'end') stopListen(); ui.endAt = 0; refresh(); focusEndInput(); } }, '자르지 않기')),
    h('span', { class: 'muted small', id: 'end-note' }, endNote(st)));
}

// 숏폼 하이라이트: 결과·길이가 같으면 다시 계산하지 않는다
function highlightOf(r) {
  const len = ui.hlLen || 30;
  if (!ui.hl || ui.hl.r !== r || ui.hl.len !== len) {
    const w = bestWindow(r.channels, r.rate, len);
    ui.hl = { r, len, ...w, clip: cutClip(r.channels, r.rate, w.start, w.end) };
  }
  return ui.hl;
}

async function downloadHighlight(song) {
  const hl = highlightOf(ui.result);
  const base = (ui.sourceName || 'master').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'master';
  const name = `${base}_highlight_${hl.len}s.wav`;
  const wav = encodeWav({ channels: hl.clip, sampleRate: ui.result.rate }, { bits: 16, normalize: false });
  const res = await saveFile(`${base}_highlight_${hl.len}s.zip`, zip([{ name, data: wav }]));
  if (res === 'saved') toast('받았어요');
  else if (res === 'unavailable') toast('이 화면에서는 파일을 받을 수 없어요');
}


function renderHighlight(song, r) {
  const hl = highlightOf(r);
  return h('div', { class: 'highlight' },
    h('div', { class: 'row' },
      h('strong', null, '숏폼 하이라이트'),
      h('div', { class: 'chips' }, [15, 30].map((n) => h('button', {
        type: 'button', class: `chip${hl.len === n ? ' on' : ''}`, 'aria-pressed': hl.len === n ? 'true' : 'false',
        onclick: () => { if (ui.listen === 'hl') stopListen(); ui.hlLen = n; refresh(); },
      }, `${n}초`))),
      h('span', { class: 'mono muted small', id: 'hl-range' }, `${mmss(hl.start)} ~ ${mmss(hl.end)}`)),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: `btn small${ui.listen === 'hl' ? ' primary' : ''}`, onclick: () => listen('hl') }, ui.listen === 'hl' ? '■ 정지' : '▶ 하이라이트 듣기'),
      h('button', { type: 'button', class: 'btn small', id: 'hl-download', disabled: !!ui.busy, onclick: () => downloadHighlight(song) }, '하이라이트 받기 (zip)'),
      h('span', { class: 'muted small' }, '가장 신나는 구간(보통 코러스)을 앞뒤 페이드 넣어 잘라요. 티저·릴스·쇼츠용 (일정의 D-7 단계).')));
}

function renderResult(song, r) {
  const warnings = masterWarnings(r, r.target);
  const ok = r.reached && r.after.peak <= -0.9;
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, '결과'),
      h('span', { class: `pill ${ok ? 'good' : 'warn-pill'}` }, ok ? '발매 규격 충족' : '확인 필요')),
    h('table', { class: 'compare' },
      h('thead', null, h('tr', null, h('th', null, ''), h('th', null, '원본'), h('th', null, '마스터'))),
      h('tbody', null,
        h('tr', null, h('th', null, '음량 (통합 LUFS)'), h('td', { class: 'mono' }, fmt(r.before.lufs, 'LUFS')), h('td', { class: 'mono' }, fmt(r.after.lufs, 'LUFS'))),
        h('tr', null, h('th', null, '트루 피크'), h('td', { class: 'mono' }, fmt(r.before.peak, 'dBTP')), h('td', { class: 'mono' }, fmt(r.after.peak, 'dBTP'))),
        h('tr', null, h('th', null, '샘플레이트'), h('td', { class: 'mono' }, `${ui.source.sampleRate} Hz`), h('td', { class: 'mono' }, `${r.rate} Hz`)),
        h('tr', null, h('th', null, '리미터 최대 감소'), h('td', null, ''), h('td', { class: 'mono' }, `${r.maxReduction.toFixed(1)} dB`)),
        r.qc ? h('tr', null, h('th', null, '잘린 파형 (원본) ', help('clipping')), h('td', { class: `mono${r.qc.clips >= CLIP_WARN ? ' over' : ''}`, id: 'qc-clips' }, `${r.qc.clips}곳`), h('td', null, '')) : null,
        r.qc ? h('tr', null, h('th', null, '스테레오 상관 ', help('correlation')), h('td', null, ''), h('td', { class: `mono${r.qc.corr < 0 ? ' over' : ''}`, id: 'qc-corr' }, r.qc.corr.toFixed(2))) : null,
        h('tr', null, h('th', null, '길이'), h('td', { class: 'mono' }, `${ui.source.duration.toFixed(1)}초`), h('td', { class: 'mono' }, `${(r.channels[0].length / r.rate).toFixed(1)}초${r.cutAt ? ` (${mmss(r.cutAt, { tenths: true })}에서 자름)` : ''}${r.trimmedStart + r.trimmedEnd > 0.05 ? ` (앞 ${r.trimmedStart.toFixed(1)}초·뒤 ${r.trimmedEnd.toFixed(1)}초 정리)` : ''}`)))),
    warnings.length ? h('ul', { class: 'warn-list' }, warnings.map((w) => h('li', null, w))) : null,
    h('div', { class: 'row' },
      h('button', { type: 'button', class: `btn${ui.listen === 'before' ? ' primary' : ''}`, onclick: () => listen('before') }, ui.listen === 'before' ? '■ 원본 정지' : '▶ 원본 듣기'),
      h('button', { type: 'button', class: `btn${ui.listen === 'after' ? ' primary' : ''}`, onclick: () => listen('after') }, ui.listen === 'after' ? '■ 마스터 정지' : '▶ 마스터 듣기'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'master-matched', checked: ui.matched, onchange: (e) => { ui.matched = e.target.checked; refresh(); } }), '같은 음량으로 비교')),
    h('div', { class: 'row' },
      h('label', { class: 'check' }, h('input', { type: 'radio', name: 'bits', id: 'bits-24', checked: ui.bits === 24, onchange: () => { ui.bits = 24; } }), '24비트 (유통사 제출 권장)'),
      h('label', { class: 'check' }, h('input', { type: 'radio', name: 'bits', id: 'bits-16', checked: ui.bits === 16, onchange: () => { ui.bits = 16; } }), '16비트 (CD 규격)'),
      h('button', { type: 'button', class: 'btn primary', disabled: !!ui.busy, onclick: () => download(song) }, 'WAV 받기 (zip)')),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn', disabled: !!ui.busy, onclick: async () => {
        const n = await useInAlbums(song);
        if (n) { toast(`앨범 ${n}개의 트랙에 연결했어요`); refresh(); return; }
        newAlbum({ fromSong: song });
        toast('이 곡으로 싱글 앨범을 만들고 마스터를 연결했어요');
      } }, ui.linked ? `앨범 ${ui.linked}개에 연결됨 · 다시 연결` : '발매 준비로 보내기 (앨범 트랙에 연결)'),
      h('span', { class: 'muted small' }, '파일을 받았다가 다시 넣을 필요 없이 앨범의 마스터로 바로 써요. 이 곡이 든 앨범이 없으면 싱글 앨범을 새로 만들어요.')),
    renderHighlight(song, r),
  );
}
