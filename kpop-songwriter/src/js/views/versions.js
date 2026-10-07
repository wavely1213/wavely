// 버전 탭: 스냅샷 저장·미리보기·복원·삭제. 버전 본문은 따로 저장돼 있어 열 때 불러온다.
import { h, formatTime, toast } from '../dom.js';
import { saveVersion, restoreVersion, deleteVersion, loadVersion, refresh } from '../state.js';
import { MAX_VERSIONS } from '../constants.js';
import { buildLyrics } from '../suno.js';
import { keyName } from '../music/theory.js';

const ui = { open: '', confirm: '', body: {}, busy: false };

export function renderVersions(song) {
  const note = h('input', { id: 'version-note', placeholder: '메모 예: Suno 3번째 생성본이 좋음, 코러스 수정 전' });
  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, '지금 상태를 버전으로 저장'),
      h('div', { class: 'row' }, note,
        h('button', { type: 'button', class: 'btn primary', disabled: ui.busy, onclick: async () => {
          ui.busy = true;
          refresh();
          const ok = await saveVersion(note.value.trim());
          ui.busy = false;
          refresh();
          toast(ok ? '버전을 저장했어요' : '버전을 저장하지 못했어요');
        } }, '버전 저장')),
      h('p', { class: 'muted' }, `곡마다 최근 ${MAX_VERSIONS}개까지 보관해요. 가사·편곡·멜로디·사운드가 모두 들어가요. 복원하면 복원 직전 상태도 자동으로 남아요.`)),
    song.versions.length
      ? h('ol', { class: 'versions' }, song.versions.map((v) => renderVersion(v)))
      : h('p', { class: 'empty card' }, '저장된 버전이 없어요. Suno에 넣기 전이나 크게 고치기 전에 저장해 두세요.'),
  );
}

function versionText(data) {
  const lyrics = buildLyrics({ ...data, members: data.members || [] }, { keepAdlibs: true });
  if (!data.music) return lyrics;
  return `${keyName(data.music.root, data.music.mode)} · ${data.music.bpm} BPM\n\n${lyrics}`;
}

function renderVersion(v) {
  const open = ui.open === v.id;
  const confirming = ui.confirm === v.id;
  const body = ui.body[v.id];
  return h('li', { class: 'version' },
    h('div', { class: 'version-head' },
      h('span', { class: 'mono muted' }, formatTime(v.at)),
      h('strong', null, v.note),
      v.total != null ? h('span', { class: 'muted' }, `가사 ${v.filled}/${v.total}`) : null,
      h('span', { class: 'push' }),
      h('button', { type: 'button', class: 'btn small ghost', onclick: async () => {
        ui.open = open ? '' : v.id;
        refresh();
        if (!open && body === undefined) {
          const full = await loadVersion(v.id);
          ui.body[v.id] = full?.data ? versionText(full.data) : null;
          refresh();
        }
      } }, open ? '닫기' : '보기'),
      h('button', { type: 'button', class: 'btn small', disabled: ui.busy, onclick: async () => {
        ui.busy = true;
        refresh();
        const ok = await restoreVersion(v.id).catch(() => false);
        ui.busy = false;
        ui.open = '';
        refresh();
        toast(ok ? '이 버전으로 되돌렸어요' : '버전을 불러오지 못했어요');
      } }, '복원'),
      confirming
        ? h('span', { class: 'row' },
          h('button', { type: 'button', class: 'btn small danger', onclick: () => { ui.confirm = ''; deleteVersion(v.id); } }, '삭제 확인'),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => { ui.confirm = ''; refresh(); } }, '취소'))
        : h('button', { type: 'button', class: 'btn small ghost', onclick: () => { ui.confirm = v.id; refresh(); } }, '삭제')),
    open ? h('pre', { class: 'version-body mono' }, body === undefined ? '불러오는 중…' : body ?? '이 버전을 찾지 못했어요.') : null,
  );
}
