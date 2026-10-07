// 앨범 화면: 머리말 + 탭(수록곡·정보·커버·일정·홍보·제출).
import { h } from '../../dom.js';
import { getState, setAlbumTab, deleteAlbum, refresh } from '../../state.js';
import { ALBUM_TYPES, daysUntil } from '../../album/model.js';
import { renderTracks } from './tracks.js';
import { renderMeta } from './meta.js';
import { renderCover } from './cover.js';
import { renderSchedule, renderPromo } from './plan.js';
import { renderSubmit } from './submit.js';
import { renderSync, syncSongId } from './sync.js';
import { renderStats } from './stats.js';
import { restoreAlbum, forgetAlbum, mastersOf, coverOf, fillFromSongMasters } from '../../album/session.js';
import { albumProgress } from '../../workflow/album-progress.js';
import { undoButtons } from '../undo-buttons.js';

const TABS = [
  ['tracks', '수록곡', renderTracks],
  ['meta', '정보·크레딧', renderMeta],
  ['cover', '커버', renderCover],
  ['sync', '싱크 가사', renderSync],
  ['schedule', '일정', renderSchedule],
  ['promo', '홍보', renderPromo],
  ['submit', '제출', renderSubmit],
  ['stats', '성과', renderStats],
];

const ui = { confirmDelete: '' };

// 발매까지 단계 + 다음 할 일 (곡 화면의 진행 단계와 같은 모양)
function renderAlbumProgress(album) {
  const { songs } = getState();
  fillFromSongMasters(album);
  const { steps, next } = albumProgress(album, songs, { masters: mastersOf(album.id), coverInfo: coverOf(album.id) });
  return h('section', { class: 'progress-steps', 'aria-label': '앨범 발매 진행 상황' },
    h('ol', { class: 'steps-row' }, steps.map((s, i) => h('li', null,
      h('button', { type: 'button', class: `step${s.done ? ' done' : ''}${next?.id === s.id ? ' next' : ''}`, 'aria-current': next?.id === s.id ? 'step' : null, onclick: () => setAlbumTab(s.tab) },
        h('span', { class: 'step-mark', 'aria-hidden': 'true' }, s.done ? '✓' : String(i + 1)),
        s.name)))),
    next
      ? h('p', { class: 'step-hint', id: 'album-step-hint' }, h('strong', null, `다음: ${next.name}`), ` — ${next.hint} `,
        h('button', { type: 'button', class: 'btn small primary', id: 'album-step-go', onclick: () => setAlbumTab(next.tab) }, '하러 가기'))
      : h('p', { class: 'step-hint', id: 'album-step-hint' }, h('strong', null, '모든 단계 완료'), ' — 발매 후 기록까지 했어요.'));
}

export function renderAlbum(album, saveLabel) {
  const st = getState();
  // 보관해 둔 마스터·커버가 있으면 불러와서 다시 그린다 (앨범마다 한 번)
  restoreAlbum(album).then((changed) => { if (changed) refresh(); });
  const [, , view] = TABS.find(([k]) => k === st.albumTab) || TABS[0];
  const left = daysUntil(album.releaseDate);
  const confirming = ui.confirmDelete === album.id;
  return h('main', { class: 'main' },
    h('header', { class: 'top' },
      h('div', { class: 'top-title' },
        h('p', { class: 'eyebrow' }, `앨범 · ${ALBUM_TYPES[album.type].name}${left != null ? ` · 발매 ${left > 0 ? `D-${left}` : left === 0 ? 'D-day' : `D+${-left}`}` : ''}`),
        h('h1', null, album.title || '새 앨범'),
        h('p', { class: 'save mono', id: 'save-status' }, saveLabel())),
      h('div', { class: 'row' },
        undoButtons(st.albumTab === 'sync' ? syncSongId(album) || album.id : album.id),
        confirming
          ? [h('span', { class: 'warn' }, '앨범 정보만 지워져요. 곡은 남아요.'),
            h('button', { type: 'button', class: 'btn danger', onclick: () => { ui.confirmDelete = ''; forgetAlbum(album.id); deleteAlbum(album.id); } }, '삭제'),
            h('button', { type: 'button', class: 'btn ghost', onclick: () => { ui.confirmDelete = ''; refresh(); } }, '취소')]
          : h('button', { type: 'button', class: 'btn ghost', onclick: () => { ui.confirmDelete = album.id; refresh(); } }, '앨범 삭제'))),
    renderAlbumProgress(album),
    h('div', { class: 'tabs-wrap' },
      h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([key, label]) => h('button', {
        type: 'button', role: 'tab', class: `tab${key === st.albumTab ? ' on' : ''}`,
        'aria-selected': key === st.albumTab ? 'true' : 'false',
        onclick: () => setAlbumTab(key),
      }, label)))),
    h('div', { class: 'view' }, view(album)),
  );
}
