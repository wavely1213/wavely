// 앨범 > 싱크 가사: 마스터를 들으며 줄이 시작될 때 버튼(스페이스)을 눌러 LRC를 만든다.
import { h, toast } from '../../dom.js';
import { getState, mutateSong, refresh, setAlbumTab } from '../../state.js';
import { mastersOf, fillFromSongMasters } from '../../album/session.js';
import { syncLines, lyricsKey, syncStatus, SYNC_LABEL, lrcTime, makeSync, shiftTimes, nudgeTime, toLrc } from '../../album/lrc.js';
import { trackFileName } from '../../album/model.js';
import { help } from '../../help.js';
import { zip } from '../../music/pack.js';
import { saveFile, isArtifact } from '../../platform/download.js';

// mode: 'idle' | 'tap'(줄마다 찍는 중) | 'check'(찍은 대로 확인 재생)
const ui = { songId: '', key: '', times: [], idx: 0, mode: 'idle', audio: null, url: '', file: null, raf: 0 };

// 재생을 멈추고, 맞추던 중이었으면 저장한다. 화면을 그리는 도중에도 불리므로 저장은 그리기가 끝난 뒤에.
export function stopSyncAudio() {
  if (ui.audio && !ui.audio.paused) ui.audio.pause();
  cancelAnimationFrame(ui.raf);
  if (ui.mode === 'idle') return;
  ui.mode = 'idle';
  const snap = capture();
  queueMicrotask(() => save(snap));
}

function audioFor(file) {
  if (ui.file === file) return ui.audio;
  stopSyncAudio();
  if (ui.url) URL.revokeObjectURL(ui.url);
  ui.file = file;
  ui.url = file ? URL.createObjectURL(file) : '';
  ui.audio = file ? new Audio(ui.url) : null;
  if (ui.audio) ui.audio.onended = () => { ui.mode = 'idle'; save(); refresh(); };
  return ui.audio;
}

// 저장할 값 (곡 id까지 지금 것으로 고정)
function capture() {
  return { songId: ui.songId, times: [...ui.times], duration: Number.isFinite(ui.audio?.duration) ? Math.round(ui.audio.duration * 100) / 100 : null, master: ui.file?.name || '' };
}

// 찍은 시각을 곡에 저장 (한 번 맞출 때마다 되돌리기 한 단계 — 싱크 탭의 ↶는 이 곡을 되돌린다)
function save(snap = capture()) {
  const s = getState().songs.find((x) => x.id === snap.songId);
  if (!s || !snap.times.some(Number.isFinite)) return;
  const sync = makeSync(s, snap.times, { duration: snap.duration, master: snap.master });
  if (JSON.stringify(s.sync?.lines) === JSON.stringify(sync.lines)) return;
  // 다 맞춘 싱크가 있는데 처음부터 다시 맞추다 멈췄으면 덮어쓰지 않는다
  if (sync.lines.some((l) => !Number.isFinite(l.t)) && syncStatus(s) === 'ok') {
    ui.key = ''; // 저장된 싱크를 다시 보여 줌
    toast('끝까지 맞추지 않아서 전에 맞춘 싱크를 그대로 뒀어요');
    refresh();
    return;
  }
  mutateSong(s.id, (x) => { x.sync = sync; });
}

// 싱크 탭에서 맞추는 곡 (앨범 트랙 중 고른 곡, 없으면 첫 곡). 머리말 ↶·Ctrl+Z도 이 곡을 되돌린다.
export function syncSongId(album) {
  const ids = album.tracks.map((t) => t.songId).filter((id) => getState().songs.some((x) => x.id === id));
  return ids.includes(ui.songId) ? ui.songId : ids[0] || null;
}

// 재생 위치에 맞춰 지금 줄 강조 + 시계 (다시 그리지 않고 DOM만 바꿈)
function tick() {
  const a = ui.audio;
  if (!a) return;
  const now = a.currentTime;
  const clock = document.getElementById('sync-clock');
  if (clock) clock.textContent = lrcTime(now);
  let cur = -1;
  ui.times.forEach((t, i) => { if (Number.isFinite(t) && t <= now) cur = i; });
  if (ui.mode === 'tap') cur = ui.idx - 1;
  document.querySelectorAll('.sync-line').forEach((el, i) => {
    el.classList.toggle('now', i === cur);
    el.classList.toggle('next', ui.mode === 'tap' && i === ui.idx);
  });
  if (!a.paused) ui.raf = requestAnimationFrame(tick);
}

function play(from) {
  const a = ui.audio;
  a.currentTime = Math.max(0, from);
  a.play().catch(() => toast('재생하지 못했어요. 다시 눌러 주세요'));
  cancelAnimationFrame(ui.raf);
  ui.raf = requestAnimationFrame(tick);
}

function startTap(fromStart) {
  if (fromStart) { ui.times = ui.times.map(() => null); ui.idx = 0; }
  ui.mode = 'tap';
  const last = ui.times.slice(0, ui.idx).reverse().find(Number.isFinite);
  play(last != null ? last - 2 : 0);
  refresh();
}

let lastKeyTap = 0;
export function tap() {
  if (ui.mode !== 'tap' || !ui.audio || ui.idx >= ui.times.length) return false;
  ui.times[ui.idx] = Math.round(ui.audio.currentTime * 100) / 100;
  ui.idx += 1;
  if (ui.idx >= ui.times.length) { ui.audio.pause(); ui.mode = 'idle'; save(); toast('다 맞췄어요. 확인 재생으로 들어 보세요'); }
  refresh();
  return true;
}

function undoTap() {
  if (ui.mode !== 'tap' || !ui.idx) return false;
  ui.idx -= 1;
  ui.times[ui.idx] = null;
  const last = ui.times.slice(0, ui.idx).reverse().find(Number.isFinite);
  play(last != null ? last - 1 : 0);
  refresh();
  return true;
}

function stop() {
  stopSyncAudio();
  refresh();
}

async function download(album, s, i) {
  const text = toLrc({ title: s.title.replace(/^예시:\s*/, ''), artist: album.artist, album: album.title, lines: s.sync.lines, duration: s.sync.duration });
  const name = trackFileName(i, s.title, 'lrc');
  // 아티팩트 다운로드는 허용 확장자만 받으므로 zip으로 감싼다
  const res = isArtifact()
    ? await saveFile(name.replace(/\.lrc$/, '.zip'), zip([{ name, data: text }]))
    : await saveFile(name, new Blob([text], { type: 'text/plain;charset=utf-8' }));
  if (res === 'saved') toast('받았어요');
  else if (res === 'unavailable') toast('이 화면에서는 파일을 받을 수 없어요');
}

export function renderSync(album) {
  const { songs } = getState();
  fillFromSongMasters(album);
  const masters = mastersOf(album.id);
  const tracks = album.tracks.map((t, i) => ({ i, s: songs.find((x) => x.id === t.songId) })).filter((x) => x.s);
  if (!tracks.length) return h('p', { class: 'empty card' }, '수록곡을 먼저 넣어 주세요.');
  if (ui.songId !== syncSongId(album)) { stopSyncAudio(); ui.songId = syncSongId(album); }
  const { i: trackIndex, s } = tracks.find((x) => x.s.id === ui.songId);
  const lines = syncLines(s);
  // 곡·가사·저장된 싱크(되돌리기 등)가 바뀌면 저장된 시각에서 다시 시작
  const key = `${s.id}\n${s.sync?.at || 0}\n${lyricsKey(s)}`;
  if (ui.key !== key) {
    ui.key = key;
    ui.times = s.sync?.key === lyricsKey(s) ? s.sync.lines.map((l) => l.t) : lines.map(() => null);
    ui.idx = ui.times.findIndex((t) => !Number.isFinite(t));
    if (ui.idx < 0) ui.idx = ui.times.length;
  }
  const m = masters[s.id];
  const a = audioFor(m?.file || null);
  const status = syncStatus(s);
  const done = ui.times.filter(Number.isFinite).length;
  const playing = a && !a.paused;

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, '싱크 가사 (LRC) ', help('lrc')),
      h('p', { class: 'muted' }, '멜론·스포티파이·애플뮤직의 "가사 따라가기"용 파일이에요. 마스터를 틀고, 각 줄을 부르기 시작할 때 버튼(또는 스페이스)을 누르면 돼요. 만든 파일은 제출 패키지에도 들어가요. 이 탭에서 ↶는 고른 곡의 싱크를 되돌려요.'),
      h('div', { class: 'chips' }, tracks.map((x) => h('button', {
        type: 'button', class: `chip${x.s.id === s.id ? ' on' : ''}`, 'aria-pressed': x.s.id === s.id ? 'true' : 'false',
        onclick: () => { if (x.s.id !== s.id) { stopSyncAudio(); ui.songId = x.s.id; refresh(); } },
      }, `${x.i + 1}. ${x.s.title.replace(/^예시:\s*/, '')} · ${SYNC_LABEL[syncStatus(x.s)]}`)))),
    !lines.length ? h('p', { class: 'empty card' }, '이 곡은 가사가 없어요 (연주곡이면 싱크 가사가 필요 없어요).')
      : !m ? h('section', { class: 'card' },
        h('p', { class: 'warn' }, '이 곡의 마스터가 없어요. 수록곡 탭에서 넣거나 마스터링 탭 결과를 보내 주세요.'),
        h('button', { type: 'button', class: 'btn small', onclick: () => setAlbumTab('tracks') }, '수록곡 탭으로'))
        : h('section', { class: 'card' },
          status === 'stale' ? h('p', { class: 'warn' }, '맞춘 뒤 가사가 바뀌었어요. 처음부터 다시 맞춰 주세요.') : null,
          s.sync?.master && s.sync.master !== m.name && status !== 'stale' ? h('p', { class: 'warn' }, `다른 마스터(${s.sync.master})로 맞춘 싱크예요. 지금 마스터와 길이가 다르면 다시 맞춰 주세요.`) : null,
          h('div', { class: 'row sync-bar' },
            h('span', { class: 'mono sync-clock', id: 'sync-clock' }, lrcTime(a.currentTime)),
            h('span', { class: 'muted small' }, `${done} / ${lines.length}줄`),
            h('span', { class: 'push' }),
            ui.mode === 'tap'
              ? [h('button', { type: 'button', class: 'btn small ghost', disabled: !ui.idx, onclick: undoTap }, '↶ 한 줄 다시 (←)'),
                h('button', { type: 'button', class: 'btn small ghost', onclick: stop }, '■ 멈춤')]
              : [h('button', { type: 'button', class: 'btn small', onclick: () => startTap(true) }, done ? '▶ 처음부터 다시 맞추기' : '▶ 맞추기 시작'),
                done && done < lines.length ? h('button', { type: 'button', class: 'btn small', onclick: () => startTap(false) }, '▶ 이어서 맞추기') : null,
                playing ? h('button', { type: 'button', class: 'btn small ghost', onclick: stop }, '■ 멈춤')
                  : h('button', { type: 'button', class: 'btn small ghost', disabled: !done, onclick: () => { ui.mode = 'check'; play(0); refresh(); } }, '▶ 확인 재생')]),
          ui.mode === 'tap'
            ? h('button', { type: 'button', class: 'btn primary wrap sync-tap', id: 'sync-tap', onclick: (e) => {
              // 스페이스는 keydown에서 이미 찍었으므로, 그 키로 생긴 버튼 클릭은 무시
              if (e.detail === 0 && performance.now() - lastKeyTap < 1000) return;
              tap();
            } }, `이 줄 시작! (스페이스) — ${lines[ui.idx] || ''}`)
            : null,
          h('ol', { class: 'sync-lines' }, lines.map((text, i) => h('li', { class: `sync-line${Number.isFinite(ui.times[i]) ? '' : ' empty'}` },
            h('button', { type: 'button', class: 'mono sync-time', disabled: !Number.isFinite(ui.times[i]) || ui.mode === 'tap', title: '여기부터 들어 보기',
              onclick: () => { ui.mode = 'check'; play(ui.times[i] - 1); refresh(); } }, Number.isFinite(ui.times[i]) ? lrcTime(ui.times[i]) : '--:--.--'),
            h('span', { class: 'sync-text' }, text),
            Number.isFinite(ui.times[i]) && ui.mode !== 'tap' ? h('span', { class: 'row' },
              h('button', { type: 'button', class: 'icon-btn', 'aria-label': `${i + 1}번 줄 0.1초 당기기`, onclick: () => { ui.times = nudgeTime(ui.times, i, -0.1); save(); } }, '◂'),
              h('button', { type: 'button', class: 'icon-btn', 'aria-label': `${i + 1}번 줄 0.1초 미루기`, onclick: () => { ui.times = nudgeTime(ui.times, i, 0.1); save(); } }, '▸')) : null))),
          done ? h('div', { class: 'row' },
            h('span', { class: 'muted small' }, '전체가 늦거나 빠르면:'),
            h('button', { type: 'button', class: 'btn small ghost', disabled: ui.mode === 'tap', onclick: () => { ui.times = shiftTimes(ui.times, -0.1); save(); } }, '전체 0.1초 당기기'),
            h('button', { type: 'button', class: 'btn small ghost', disabled: ui.mode === 'tap', onclick: () => { ui.times = shiftTimes(ui.times, 0.1); save(); } }, '전체 0.1초 미루기'),
            h('span', { class: 'push' }),
            h('button', { type: 'button', class: 'btn primary', disabled: status !== 'ok', onclick: () => download(album, s, trackIndex) }, 'LRC 받기')) : null),
  );
}

// 싱크 화면에서 스페이스 = 이 줄 시작, ← = 한 줄 다시 (입력 칸 밖에서만)
document.addEventListener('keydown', (e) => {
  if (ui.mode !== 'tap' || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  if (e.code === 'Space' || e.key === ' ') { if (tap()) { lastKeyTap = performance.now(); e.preventDefault(); } } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') { if (undoTap()) e.preventDefault(); }
});
