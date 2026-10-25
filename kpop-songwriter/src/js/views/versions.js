// 버전 탭: 스냅샷 저장·미리보기·지금과 비교·복원·삭제. 버전 본문은 따로 저장돼 있어 열 때 불러온다.
import { h, formatTime, toast } from '../dom.js';
import { saveVersion, restoreVersion, deleteVersion, loadVersion, refresh, maxVersions, versionsToDrop, isAutoVersion, restoreNeedsAutoSave } from '../state.js';
import { buildLyrics } from '../suno.js';
import { keyName } from '../music/theory.js';
import { lineDiff } from '../textdiff.js';

const ui = { open: '', confirm: '', body: {}, busy: false, diff: '' };

export function renderVersions(song) {
  const note = h('input', { id: 'version-note', 'aria-label': '버전 메모', placeholder: '메모 예: Suno 3번째 생성본이 좋음, 코러스 수정 전' });
  const saveDrops = dropsFor(song);
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
      saveDrops.length ? dropNote(saveDrops, '저장하면') : null,
      h('p', { class: 'muted' }, `곡마다 ${maxVersions()}개까지 보관해요. 넘으면 '복원 전 자동 저장'부터, 그다음 오래된 버전부터 지워요. 가사·편곡·멜로디·사운드가 모두 들어가요. 복원하면 복원 직전 상태도 자동으로 남아요.`)),
    song.versions.length
      ? h('ol', { class: 'versions' }, song.versions.map((v) => renderVersion(v, song)))
      : h('p', { class: 'empty card' }, '저장된 버전이 없어요. Suno에 넣기 전이나 크게 고치기 전에 저장해 두세요.'),
  );
}

function versionText(data) {
  const lyrics = buildLyrics({ ...data, members: data.members || [] }, { keepAdlibs: true });
  if (!data.music) return lyrics;
  return `${keyName(data.music.root, data.music.mode)} · ${data.music.bpm} BPM\n\n${lyrics}`;
}

// 이 버전 → 지금: 빠진 줄(−)·더한 줄(+). 바뀐 줄이 없으면 그렇다고.
function renderDiff(oldText, song) {
  const rows = lineDiff(oldText, versionText(song));
  if (!rows.some((r) => r.type !== 'same')) return h('p', { class: 'muted' }, '지금과 같아요.');
  return h('pre', { class: 'version-body mono diff', id: 'version-diff' }, rows.map((r) => h('span', { class: `diff-${r.type}` }, `${r.type === 'add' ? '+ ' : r.type === 'del' ? '− ' : '  '}${r.text}`)));
}

// 새 버전이 하나 생기면 밀려나는 버전 (keepId: 복원하는 버전). 자동 저장도 저장 안 한 작업일 수 있어 함께 알린다
function dropsFor(song, keepId) {
  return versionsToDrop([{ id: '' }, ...song.versions], maxVersions(), keepId);
}
const dropName = (x) => (isAutoVersion(x) ? `${x.note}(${formatTime(x.at)})` : x.note);
const dropNote = (drops, verb) => h('p', { class: 'muted small version-drop' }, `${verb} 보관 칸이 모자라 '${drops.map(dropName).join("', '")}' 버전이 지워져요`);

// 복원 뒤 고친 게 없으면 자동 저장을 만들지 않으므로 지워지는 것도 없다
function restoreDrops(v, song) {
  return restoreNeedsAutoSave(song) ? dropsFor(song, v.id) : [];
}

function renderVersion(v, song) {
  const open = ui.open === v.id;
  const confirming = ui.confirm === v.id;
  const body = ui.body[v.id];
  const drops = restoreDrops(v, song);
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
    drops.length ? dropNote(drops, '복원하면') : null,
    open && body ? h('div', { class: 'row' },
      h('button', { type: 'button', class: `btn small${ui.diff === v.id ? ' primary' : ''}`, id: `diff-${v.id}`, onclick: () => { ui.diff = ui.diff === v.id ? '' : v.id; refresh(); } }, ui.diff === v.id ? '이 버전만 보기' : '지금과 비교'),
      ui.diff === v.id ? h('span', { class: 'muted small' }, '− 이 버전에만 있던 줄 · + 지금 새로 생긴 줄') : null) : null,
    open && body && ui.diff === v.id ? renderDiff(body, song)
      : open ? h('pre', { class: 'version-body mono' }, body === undefined ? '불러오는 중…' : body ?? '이 버전을 찾지 못했어요.') : null,
  );
}
