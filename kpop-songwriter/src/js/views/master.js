// 마스터링 탭: Suno 완성곡(또는 앱 데모)을 발매 규격(음량·트루 피크·44.1kHz)으로 맞춰 WAV로 받는다.
import { h, toast } from '../dom.js';
import { mutate, refresh } from '../state.js';
import { decodeFile, master, masterWarnings, MASTER_PRESETS, LOUDNESS_TARGETS, OUTPUT_RATE } from '../music/master.js';
import { renderSong, stop as stopPlayer } from '../music/player.js';
import { encodeWav, zip } from '../music/pack.js';

// 오디오 버퍼는 커서 저장하지 않고 화면 메모리에만 둔다
const ui = { source: null, sourceName: '', result: null, busy: '', bits: 24, listen: null, matched: true };
let audioCtx = null;
let playing = null;

function settings(song) {
  return { preset: 'kpop', target: -14, ...(song.master || {}) };
}

function stopListen() {
  try { playing?.stop(); } catch { /* 이미 멈춤 */ }
  playing = null;
  ui.listen = null;
}

function listen(which) {
  stopPlayer();
  if (ui.listen === which) { stopListen(); refresh(); return; }
  stopListen();
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const r = ui.result;
  let buffer;
  if (which === 'before') {
    buffer = ui.source;
  } else {
    buffer = audioCtx.createBuffer(2, r.channels[0].length, r.rate);
    r.channels.forEach((c, i) => buffer.copyToChannel(c, i));
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  const g = audioCtx.createGain();
  // 음량 맞춰 비교: 큰 쪽을 줄여 같은 크기로 듣는다 (커서 좋게 들리는 착각 방지)
  if (ui.matched && Number.isFinite(r.before.lufs)) {
    const diff = r.after.lufs - r.before.lufs;
    g.gain.value = which === 'after' ? Math.min(1, 10 ** (-diff / 20)) : Math.min(1, 10 ** (diff / 20));
  }
  src.connect(g).connect(audioCtx.destination);
  src.onended = () => { if (playing === src) { playing = null; ui.listen = null; refresh(); } };
  src.start();
  playing = src;
  ui.listen = which;
  refresh();
}

async function loadFile(f) {
  stopListen();
  ui.busy = '파일 읽는 중';
  ui.result = null;
  refresh();
  try {
    ui.source = await decodeFile(f);
    ui.sourceName = f.name.replace(/\.[^.]+$/, '');
  } catch {
    toast('이 파일은 읽지 못했어요. WAV나 MP3로 다시 시도해 주세요');
  } finally {
    ui.busy = '';
    refresh();
  }
}

async function loadDemo(song) {
  stopListen();
  ui.busy = '앱 데모 녹음 중';
  ui.result = null;
  refresh();
  try {
    ui.source = await renderSong(song);
    ui.sourceName = `${song.title.replace(/^예시:\s*/, '')} (앱 데모)`;
  } catch {
    toast('데모를 만들지 못했어요');
  } finally {
    ui.busy = '';
    refresh();
  }
}

async function run(song) {
  stopListen();
  const st = settings(song);
  ui.result = null;
  ui.busy = '준비 중';
  refresh();
  try {
    ui.result = await master(ui.source, st, (t) => {
      ui.busy = t;
      const el = document.getElementById('master-status');
      if (el) el.textContent = t;
    });
    ui.result.target = st.target;
  } catch {
    toast('마스터링 중 문제가 생겼어요. 다른 파일로 시도해 주세요');
  } finally {
    ui.busy = '';
    refresh();
  }
}

async function download(song) {
  const dl = window.claude?.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (!dl) { toast('이 화면에서는 파일을 받을 수 없어요. claude.ai에서 열어 주세요'); return; }
  const r = ui.result;
  const st = settings(song);
  const base = (ui.sourceName || 'master').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'master';
  const wavName = `${base}_master_${Math.abs(st.target)}LUFS_${ui.bits}bit.wav`;
  ui.busy = 'WAV 만드는 중';
  refresh();
  try {
    const wav = encodeWav({ channels: r.channels, sampleRate: r.rate }, { bits: ui.bits, normalize: false });
    const report = [
      `원본: ${ui.sourceName}`,
      `프리셋: ${MASTER_PRESETS[st.preset].name}`,
      `목표 음량: ${st.target} LUFS / 트루 피크 한도: -1 dBTP`,
      `결과: ${r.after.lufs.toFixed(1)} LUFS, ${r.after.peak.toFixed(1)} dBTP, ${OUTPUT_RATE} Hz ${ui.bits}bit 스테레오 WAV`,
      `원본 측정: ${Number.isFinite(r.before.lufs) ? r.before.lufs.toFixed(1) : '무음'} LUFS, ${r.before.peak.toFixed(1)} dBTP`,
      `리미터 최대 감소: ${r.maxReduction.toFixed(1)} dB`,
      '',
      ...masterWarnings(r, st.target),
      '',
      '유통사 제출 전: 앞뒤 무음 길이, 곡 끝이 잘리지 않았는지 직접 들어 확인하세요.',
    ].join('\n');
    const blob = zip([{ name: wavName, data: wav }, { name: 'mastering_report.txt', data: report }]);
    ui.busy = '저장 확인 창을 확인해 주세요';
    refresh();
    await dl.save({ filename: `${base}_master.zip`, data: blob });
    toast('받았어요');
  } catch (e) {
    if (e?.code !== 'declined') toast('파일을 만들지 못했어요. 다시 눌러 주세요');
  } finally {
    ui.busy = '';
    refresh();
  }
}

const fmt = (v, unit) => (Number.isFinite(v) ? `${v.toFixed(1)} ${unit}` : '—');

export function renderMaster(song) {
  const st = settings(song);
  const r = ui.result;
  const busy = !!ui.busy;
  const file = h('input', { type: 'file', id: 'master-file', accept: 'audio/*', class: 'visually-hidden', onchange: (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) loadFile(f);
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
    h('section', { class: 'card' },
      h('h2', null, '설정'),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '음색'),
        h('div', { class: 'chips' }, Object.entries(MASTER_PRESETS).map(([k, p]) => h('button', {
          type: 'button', class: `chip${st.preset === k ? ' on' : ''}`, 'aria-pressed': st.preset === k ? 'true' : 'false',
          onclick: () => mutate((s) => { s.master = { ...settings(s), preset: k }; }),
        }, p.name)))),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '목표 음량'),
        h('div', { class: 'chips' }, LOUDNESS_TARGETS.map((t) => h('button', {
          type: 'button', class: `chip${st.target === t.value ? ' on' : ''}`, 'aria-pressed': st.target === t.value ? 'true' : 'false',
          onclick: () => mutate((s) => { s.master = { ...settings(s), target: t.value }; }),
        }, t.name))),
        targetNote ? h('span', { class: 'muted' }, targetNote) : null),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn primary', disabled: busy || !ui.source, onclick: () => run(song) }, '마스터링 하기'),
        busy ? h('span', { class: 'status' }, h('span', { class: 'dot' }), h('span', { id: 'master-status' }, ui.busy)) : null,
        !ui.source && !busy ? h('span', { class: 'muted' }, '먼저 파일을 넣어 주세요') : null)),
    r ? renderResult(song, r) : null,
  );
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
        h('tr', null, h('th', null, '리미터 최대 감소'), h('td', null, ''), h('td', { class: 'mono' }, `${r.maxReduction.toFixed(1)} dB`)))),
    warnings.length ? h('ul', { class: 'warn-list' }, warnings.map((w) => h('li', null, w))) : null,
    h('div', { class: 'row' },
      h('button', { type: 'button', class: `btn${ui.listen === 'before' ? ' primary' : ''}`, onclick: () => listen('before') }, ui.listen === 'before' ? '■ 원본 정지' : '▶ 원본 듣기'),
      h('button', { type: 'button', class: `btn${ui.listen === 'after' ? ' primary' : ''}`, onclick: () => listen('after') }, ui.listen === 'after' ? '■ 마스터 정지' : '▶ 마스터 듣기'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'master-matched', checked: ui.matched, onchange: (e) => { ui.matched = e.target.checked; } }), '같은 음량으로 비교')),
    h('div', { class: 'row' },
      h('label', { class: 'check' }, h('input', { type: 'radio', name: 'bits', id: 'bits-24', checked: ui.bits === 24, onchange: () => { ui.bits = 24; } }), '24비트 (유통사 제출 권장)'),
      h('label', { class: 'check' }, h('input', { type: 'radio', name: 'bits', id: 'bits-16', checked: ui.bits === 16, onchange: () => { ui.bits = 16; } }), '16비트 (CD 규격)'),
      h('button', { type: 'button', class: 'btn primary', disabled: !!ui.busy, onclick: () => download(song) }, 'WAV 받기 (zip)')),
  );
}
