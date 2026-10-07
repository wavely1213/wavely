// 진입점: 저장소 열기 → 상태 초기화 → 화면 그리기.
import { h, formatTime } from './dom.js';
import { openStore } from './store.js';
import { init, subscribe, getState, current, currentAlbum, newSong, selectSong, setTab, deleteSong, refresh, newAlbum, selectAlbum } from './state.js';
import { renderAlbum } from './views/album/index.js';
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
import { renderMaster } from './views/master.js';
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

const ui = { confirmDelete: '', aiAvailable: true };

function saveLabel() {
  const st = getState();
  const song = current();
  if (st.mode === 'song' && song?.example) return '예시 곡 · 고치면 내 곡으로 저장돼요';
  const where = st.store?.kind === 'account' ? '내 계정에' : '이 브라우저에';
  if (st.saveStatus === 'pending') return '저장 중…';
  if (st.saveStatus === 'error') return '저장 실패 · 잠시 후 다시 시도해요';
  return `${where} 저장됨`;
}

function renderSidebar() {
  const st = getState();
  return h('nav', { class: 'songs', 'aria-label': '곡·앨범 목록' },
    h('div', { class: 'side-head' }, h('span', { class: 'field-label' }, '곡'),
      h('button', { type: 'button', class: 'btn small primary', onclick: () => { stopPlayer(); newSong(); } }, '+ 새 곡')),
    h('ul', null, st.songs.map((s) => {
      const active = st.mode === 'song' && s.id === st.currentId;
      return h('li', null,
        h('button', { type: 'button', class: `song-item${active ? ' active' : ''}`, 'aria-current': active ? 'true' : null, onclick: () => { stopPlayer(); selectSong(s.id); } },
          h('span', { class: 'song-title' }, s.title || '제목 없음'),
          h('span', { class: 'song-meta mono' }, s.example ? '예시' : formatTime(s.updatedAt))));
    })),
    h('div', { class: 'side-head' }, h('span', { class: 'field-label' }, '앨범·발매'),
      h('button', { type: 'button', class: 'btn small', onclick: () => { stopPlayer(); newAlbum(); } }, '+ 새 앨범')),
    st.albums.length
      ? h('ul', null, st.albums.map((a) => {
        const active = st.mode === 'album' && a.id === st.albumId;
        return h('li', null,
          h('button', { type: 'button', class: `song-item${active ? ' active' : ''}`, 'aria-current': active ? 'true' : null, onclick: () => { stopPlayer(); selectAlbum(a.id); } },
            h('span', { class: 'song-title' }, a.title || '새 앨범'),
            h('span', { class: 'song-meta mono' }, `${a.tracks.length}곡 · ${a.releaseDate || '발매일 미정'}`)));
      }))
      : h('p', { class: 'muted small' }, '곡을 묶어 발매 준비(메타데이터·커버·제출 패키지·일정)를 해요.'),
  );
}

function renderHeader(song) {
  const confirming = ui.confirmDelete === song.id;
  return h('header', { class: 'top' },
    h('div', { class: 'top-title' },
      h('p', { class: 'eyebrow' }, 'K-pop 작사·작곡 노트'),
      h('h1', null, song.title || '제목 없음'),
      h('p', { class: 'save mono', id: 'save-status' }, saveLabel())),
    h('div', { class: 'row' },
      confirming
        ? [h('span', { class: 'warn' }, '이 곡과 버전이 모두 지워져요.'),
          h('button', { type: 'button', class: 'btn danger', onclick: () => { ui.confirmDelete = ''; deleteSong(song.id); } }, '삭제'),
          h('button', { type: 'button', class: 'btn ghost', onclick: () => { ui.confirmDelete = ''; refresh(); } }, '취소')]
        : h('button', { type: 'button', class: 'btn ghost', onclick: () => { ui.confirmDelete = song.id; refresh(); } }, '곡 삭제')),
  );
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
  const st = getState();
  const song = current();
  if (!song) return;
  const y = window.scrollY;
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
      ui.aiAvailable ? null : h('p', { class: 'warn card' }, '이 화면에서는 Claude를 부를 수 없어요. claude.ai에서 열면 AI 기능이 켜져요. 나머지 기능은 그대로 쓸 수 있어요.'),
      renderTabs(st.tab),
      h('div', { class: 'view' }, view(song))),
  );
  window.scrollTo(0, y);
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

subscribe((scope) => {
  if (scope === 'all') render();
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
