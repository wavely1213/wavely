// 진입점: 저장소 열기 → 상태 초기화 → 화면 그리기.
import { h, formatTime, toast } from './dom.js';
import { openStore } from './store.js';
import { init, subscribe, getState, current, currentAlbum, newSong, selectSong, setTab, deleteSong, refresh, newAlbum, selectAlbum, showTaste, undo, redo, duplicateSong } from './state.js';
import { undoButtons } from './views/undo-buttons.js';
import { backupSection, importFile } from './views/backup.js';
import { songSearch } from './views/song-search.js';
import { renderAlbum } from './views/album/index.js';
import { renderTaste } from './views/taste.js';
import { newSinceSummary, SUMMARY_EVERY } from './learn/taste.js';
import { songProgress } from './workflow/progress.js';
import { restoreSong, restoreAlbum } from './album/session.js';
import { getSample } from './ai.js';
import { renderConcept } from './views/concept.js';
import { renderEditor } from './views/editor.js';
import { renderStyle } from './views/style.js';
import { renderExport } from './views/export.js';
import { renderVersions } from './views/versions.js';
import { renderArrange } from './views/arrange.js';
import { renderMelody } from './views/melody.js';
import { renderSound } from './views/sound.js';
import { renderReferences } from './views/references.js';
import { renderMaster, stopMasterPreview } from './views/master.js';
import { stopSyncAudio, syncSongId } from './views/album/sync.js';
import { onPlayer, stop as stopPlayer } from './music/player.js';

const TABS = [
  ['concept', '컨셉·멤버', renderConcept],
  ['editor', '구조·가사', renderEditor],
  ['arrange', '편곡', renderArrange],
  ['melody', '멜로디', renderMelody],
  ['sound', '사운드', renderSound],
  ['references', '레퍼런스', renderReferences],
  ['style', 'Suno 스타일', renderStyle],
  ['export', '내보내기', renderExport],
  ['master', '마스터링', renderMaster],
  ['versions', '버전', renderVersions],
];

const ui = { confirmDelete: '', aiAvailable: true, navOpen: false };
// 빌드 대상: 웹사이트(mulgyeol.kr/music) 빌드에서만 true (build.mjs의 define)
const WEB = typeof __WEB__ !== 'undefined' && __WEB__;

// 웹사이트에서만: 오프라인·홈 화면 추가용 서비스 워커 (https 또는 localhost에서만 동작)
if (WEB && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}

function saveLabel() {
  const st = getState();
  const song = current();
  if (st.mode === 'song' && song?.example) return '예시 곡 · 고치면 내 곡으로 저장돼요';
  const where = st.store?.kind === 'account' ? '내 계정에' : '이 브라우저에';
  if (st.saveStatus === 'pending') return '저장 중…';
  if (st.saveStatus === 'error') return '저장 실패 · 잠시 후 다시 시도해요';
  return `${where} 저장됨`;
}

// 폰에서는 목록을 접어 두고(지금 보는 것 이름만), 버튼으로 펼친다. 넓은 화면에서는 항상 펼침.
function nowLabel(st) {
  if (st.mode === 'taste') return '내 취향';
  if (st.mode === 'album') return `앨범 · ${currentAlbum()?.title || '새 앨범'}`;
  return current()?.title || '제목 없음';
}
const pick = (fn) => () => { ui.navOpen = false; stopPlayer(); fn(); };

function renderSidebar() {
  const st = getState();
  const find = songSearch(st.songs);
  return h('nav', { class: `songs${ui.navOpen ? '' : ' collapsed'}`, 'aria-label': '곡·앨범 목록' },
    h('button', { type: 'button', class: 'nav-toggle', 'aria-expanded': ui.navOpen ? 'true' : 'false', onclick: () => { ui.navOpen = !ui.navOpen; refresh(); } },
      h('span', { 'aria-hidden': 'true' }, ui.navOpen ? '✕' : '☰'),
      h('span', { class: 'nav-now' }, ui.navOpen ? '목록 닫기' : nowLabel(st)),
      h('span', { class: 'muted small' }, ui.navOpen ? '' : '곡·앨범 목록')),
    h('div', { class: 'side-head' }, h('span', { class: 'field-label' }, '곡'),
      h('span', { class: 'row' },
        h('input', { type: 'file', id: 'import-song', accept: '.json,.zip,application/json,application/zip', class: 'visually-hidden', onchange: async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) { ui.navOpen = false; await importFile(f); }
        } }),
        h('label', { for: 'import-song', class: 'btn small ghost', title: '전체 백업 파일, 또는 제작 패키지(zip·project.json)로 곡 되살리기' }, '가져오기'),
        h('button', { type: 'button', class: 'btn small primary', onclick: pick(newSong) }, '+ 새 곡'))),
    find.field,
    h('ul', { id: 'song-list' }, st.songs.map((s) => {
      const active = st.mode === 'song' && s.id === st.currentId;
      return find.item(s, h('li', null,
        h('button', { type: 'button', class: `song-item${active ? ' active' : ''}`, 'aria-current': active ? 'true' : null, onclick: pick(() => selectSong(s.id)) },
          h('span', { class: 'song-title' }, s.title || '제목 없음'),
          h('span', { class: 'song-meta mono' }, s.example ? '예시' : formatTime(s.updatedAt)))));
    })),
    find.field ? find.none : null,
    h('div', { class: 'side-head' }, h('span', { class: 'field-label' }, '앨범·발매'),
      h('button', { type: 'button', class: 'btn small', onclick: pick(() => newAlbum()) }, '+ 새 앨범')),
    st.albums.length
      ? h('ul', null, st.albums.map((a) => {
        const active = st.mode === 'album' && a.id === st.albumId;
        return h('li', null,
          h('button', { type: 'button', class: `song-item${active ? ' active' : ''}`, 'aria-current': active ? 'true' : null, onclick: pick(() => selectAlbum(a.id)) },
            h('span', { class: 'song-title' }, a.title || '새 앨범'),
            h('span', { class: 'song-meta mono' }, `${a.tracks.length}곡 · ${a.releaseDate || '발매일 미정'}`)));
      }))
      : h('p', { class: 'muted small' }, '곡을 묶어 발매 준비(메타데이터·커버·제출 패키지·일정)를 해요.'),
    h('div', { class: 'side-head' }, h('span', { class: 'field-label' }, '학습')),
    h('button', { type: 'button', class: `song-item${st.mode === 'taste' ? ' active' : ''}`, onclick: pick(showTaste) },
      h('span', { class: 'song-title' }, '내 취향'),
      h('span', { class: 'song-meta mono' }, `반응 ${st.taste.log.length}개${st.taste.enabled ? '' : ' · 꺼짐'}${newSinceSummary(st.taste) >= SUMMARY_EVERY ? ' · 정리 추천' : ''}`)),
    backupSection(),
  );
}

function renderHeader(song) {
  const confirming = ui.confirmDelete === song.id;
  return h('header', { class: 'top' },
    h('div', { class: 'top-title' },
      h('p', { class: 'eyebrow' }, WEB ? '물결 뮤직 · K-pop 작곡 노트' : 'K-pop 작사·작곡 노트'),
      h('h1', null, song.title || '제목 없음'),
      h('p', { class: 'save mono', id: 'save-status' }, saveLabel())),
    h('div', { class: 'row' },
      undoButtons(song.id),
      confirming ? null : h('button', { type: 'button', class: 'btn', onclick: () => {
        const existing = getState().albums.find((a) => a.tracks.some((t) => t.songId === song.id));
        if (existing) selectAlbum(existing.id); else newAlbum({ fromSong: song });
      } }, getState().albums.some((a) => a.tracks.some((t) => t.songId === song.id)) ? '발매 준비 보기' : '싱글 발매 준비'),
      confirming
        ? [h('span', { class: 'warn' }, (() => {
          const n = getState().albums.filter((a) => a.tracks.some((t) => t.songId === song.id)).length;
          return n ? `이 곡과 버전이 모두 지워지고, 앨범 ${n}개에서도 빠져요.` : '이 곡과 버전이 모두 지워져요.';
        })()),
          h('button', { type: 'button', class: 'btn danger', onclick: () => { ui.confirmDelete = ''; deleteSong(song.id); } }, '삭제'),
          h('button', { type: 'button', class: 'btn ghost', onclick: () => { ui.confirmDelete = ''; refresh(); } }, '취소')]
        : [h('button', { type: 'button', class: 'btn ghost', id: 'song-dup', title: '어쿠스틱·리믹스 등 다른 버전을 시도할 때', onclick: () => { stopPlayer(); if (duplicateSong(song.id)) toast('사본을 만들었어요. 원본은 그대로예요'); } }, '복제'),
          h('button', { type: 'button', class: 'btn ghost', onclick: () => { ui.confirmDelete = song.id; refresh(); } }, '곡 삭제')]),
  );
}

// 발매까지 진행 단계: 끝난 단계 ✓, 다음 할 일 강조 + 바로 가기
function renderProgress(song) {
  const st = getState();
  // 새로고침 뒤엔 마스터·커버가 보관함에만 있으니, 처음 볼 때 불러와서 다시 그린다
  Promise.all([restoreSong(song.id), ...st.albums.filter((a) => a.tracks.some((t) => t.songId === song.id)).map(restoreAlbum)])
    .then((r) => { if (r.some(Boolean)) refresh(); });
  const { steps, next, album } = songProgress(song, { albums: st.albums, songs: st.songs });
  const go = (s) => {
    if (s.id === 'release') {
      if (album) selectAlbum(album.id); else newAlbum({ fromSong: song });
    } else setTab(s.tab);
  };
  const done = steps.filter((s) => s.done).length;
  return h('section', { class: 'progress-steps', 'aria-label': '발매까지 진행 상황' },
    h('ol', { class: 'steps-row' }, steps.map((s, i) => h('li', null,
      h('button', { type: 'button', class: `step${s.done ? ' done' : ''}${next?.id === s.id ? ' next' : ''}`, onclick: () => go(s), 'aria-current': next?.id === s.id ? 'step' : null },
        h('span', { class: 'step-mark', 'aria-hidden': 'true' }, s.done ? '✓' : String(i + 1)),
        s.name)))),
    next
      ? h('p', { class: 'step-hint' }, h('strong', null, `다음: ${next.name}`), ` — ${next.hint} `,
        h('button', { type: 'button', class: 'btn small primary', onclick: () => go(next) }, '하러 가기'))
      : h('p', { class: 'step-hint' }, h('strong', null, `${done}/${steps.length} 단계 완료`), ' — 유통사에 제출할 준비가 끝났어요.'));
}

function renderTabs(active) {
  return h('div', { class: 'tabs-wrap' },
    h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([key, label]) => h('button', {
      type: 'button', role: 'tab', class: `tab${key === active ? ' on' : ''}`,
      'aria-selected': key === active ? 'true' : 'false',
      onclick: () => setTab(key),
    }, label))));
}

// 다시 그리기 전후로 포커스와 커서 위치를 id 기준으로 유지한다
function keepFocus(draw) {
  const a = document.activeElement;
  const id = a && a !== document.body ? a.id : '';
  let sel = null;
  try { if (id && typeof a.selectionStart === 'number') sel = [a.selectionStart, a.selectionEnd]; } catch { /* 선택 범위 없는 입력 */ }
  draw();
  if (!id) return;
  const el = document.getElementById(id);
  if (!el || el === document.activeElement) return;
  el.focus({ preventScroll: true });
  if (sel) { try { el.setSelectionRange(sel[0], sel[1]); } catch { /* 무시 */ } }
}

function render() {
  keepFocus(draw);
}

function draw() {
  const root = document.getElementById('app');
  const now = getState();
  if (!(now.mode === 'song' && now.tab === 'master')) stopMasterPreview();
  if (!(now.mode === 'album' && now.albumTab === 'sync')) stopSyncAudio();
  const st = getState();
  const song = current();
  if (!song) return;
  const y = window.scrollY;
  if (st.mode === 'taste') {
    root.replaceChildren(renderSidebar(), renderTaste(saveLabel));
    window.scrollTo(0, y);
    return;
  }
  const album = st.mode === 'album' ? currentAlbum() : null;
  if (album) {
    root.replaceChildren(renderSidebar(), renderAlbum(album, saveLabel));
    window.scrollTo(0, y);
    return;
  }
  const [, , view] = TABS.find(([k]) => k === st.tab) || TABS[0];
  root.replaceChildren(
    renderSidebar(),
    h('main', { class: 'main' },
      renderHeader(song),
      song.example ? null : renderProgress(song),
      ui.aiAvailable ? null : h('p', { class: 'warn card' }, WEB
        ? '웹사이트에서는 AI 기능(작사·편곡·멜로디·홍보 문구)을 아직 쓸 수 없어요. 작곡·편곡·마스터링·앨범 발매 준비는 모두 쓸 수 있고, 작업은 이 브라우저에 저장돼요.'
        : '이 화면에서는 Claude를 부를 수 없어요. claude.ai에서 열면 AI 기능이 켜져요. 나머지 기능은 그대로 쓸 수 있어요.'),
      renderTabs(st.tab),
      h('div', { class: 'view' }, view(song))),
  );
  window.scrollTo(0, y);
}

// 탭 줄: 다시 그려도 고른 탭이 보이게 옆으로 밀어 두고, 오른쪽에 더 있으면 끝을 흐리게
function fixTabs() {
  document.querySelectorAll('.tabs-wrap').forEach((wrap) => {
    const on = wrap.querySelector('.tab.on');
    if (on && on.offsetLeft + on.offsetWidth > wrap.scrollLeft + wrap.clientWidth) wrap.scrollLeft = on.offsetLeft - 24;
    const mark = () => wrap.classList.toggle('more-right', wrap.scrollLeft + wrap.clientWidth < wrap.scrollWidth - 4);
    wrap.onscroll = mark;
    mark();
  });
}

// 재생 위치 표시: 진행 막대, 재생 중인 섹션 강조, 피아노롤 재생선
let wasPlaying = false;
onPlayer((st) => {
  if (!st.playing) {
    if (wasPlaying) { wasPlaying = false; refresh(); }
    return;
  }
  wasPlaying = true;
  const bar = document.getElementById('play-progress');
  if (bar) bar.style.width = `${Math.min(100, (st.step / st.totalSteps) * 100)}%`;
  const mark = [...st.marks].reverse().find((m) => m.step <= st.step);
  document.querySelectorAll('.sec-row').forEach((el) => el.classList.toggle('playing', el.dataset.id === mark?.id));
  const ph = document.getElementById('roll-playhead');
  if (ph) {
    const m = st.marks.find((x) => x.id === ph.dataset.section);
    const local = m ? st.step - m.step : -1;
    ph.hidden = !m || local < 0 || local > m.bars * 16;
    if (!ph.hidden) ph.style.left = `${local * 22}px`;
  }
});

// 글 입력 칸 밖에서 Ctrl/⌘+Z = 되돌리기, Ctrl/⌘+Shift+Z·Ctrl+Y = 다시 하기 (입력 칸 안에서는 브라우저 기본 동작)
document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  const st = getState();
  if (st.mode !== 'song' && st.mode !== 'album') return;
  // 싱크 가사 탭에서는 맞추는 곡을 되돌린다 (싱크는 곡에 저장됨)
  const album = st.mode === 'album' ? currentAlbum() : null;
  const id = album && st.albumTab === 'sync' ? syncSongId(album) || album.id : undefined;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { if (undo(id)) e.preventDefault(); } else if ((k === 'z' && e.shiftKey) || k === 'y') { if (redo(id)) e.preventDefault(); }
});

subscribe((scope) => {
  if (scope === 'all') { render(); fixTabs(); }
  else if (scope === 'status') {
    const el = document.getElementById('save-status');
    if (el) el.textContent = saveLabel();
  }
});

async function start() {
  const store = await openStore();
  await init(store);
  getSample().then((s) => { if (!s) { ui.aiAvailable = false; refresh(); } });
}

start();
