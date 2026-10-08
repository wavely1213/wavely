// 곡 목록 아래 "백업": 전체 백업 받기, 가져오기(백업 파일·project.json·제작 패키지 zip).
import { h, toast } from '../dom.js';
import { getState, importSong, applyRestore, refresh } from '../state.js';
import { makeBackup, isBackup, planRestore, readImportFile, backupFileName } from '../backup.js';
import { zip } from '../music/pack.js';
import { saveFile, isArtifact } from '../platform/download.js';
import { WARN_AT } from '../storage-usage.js';

const ui = { busy: false, restoring: false };

async function downloadBackup() {
  ui.busy = true;
  refresh();
  try {
    const st = getState();
    const data = await makeBackup(st, (sid, vid) => st.store.getVersion(sid, vid));
    const text = JSON.stringify(data);
    const name = backupFileName();
    // 아티팩트 다운로드는 허용 확장자만 받으므로 zip으로 감싼다
    const res = isArtifact()
      ? await saveFile(`${name}.zip`, zip([{ name: `${name}.json`, data: text }]))
      : await saveFile(`${name}.json`, new Blob([text], { type: 'application/json' }));
    if (res === 'saved') toast(`곡 ${data.songs.length}개·앨범 ${data.albums.length}개를 백업했어요`);
    else if (res === 'unavailable') toast('이 화면에서는 파일을 받을 수 없어요');
  } catch {
    toast('백업 파일을 만들지 못했어요');
  } finally {
    ui.busy = false;
    refresh();
  }
}

export async function importFile(file) {
  if (ui.restoring) { toast('되살리는 중이에요. 끝나면 다시 넣어 주세요'); return; }
  let data;
  try { data = await readImportFile(file); } catch { toast('파일을 읽지 못했어요'); return; }
  if (isBackup(data)) {
    const st = getState();
    const plan = planRestore(st, data);
    ui.restoring = true;
    toast('되살리는 중… (버전이 많으면 조금 걸려요)');
    try { await applyRestore(plan); } finally { ui.restoring = false; }
    const r = plan.report;
    toast(r.songs || r.albums || r.taste
      ? `되살렸어요: 곡 ${r.songs}개, 앨범 ${r.albums}개, 취향 기록 ${r.taste}개${r.same ? ` (이미 같은 것 ${r.same}개는 건너뜀)` : ''}`
      : '백업 내용이 지금과 같아요. 바뀐 게 없어요');
    return;
  }
  if (!importSong(data)) toast('곡 파일이 아니에요. 백업 파일이나 제작 패키지의 project.json을 넣어 주세요');
  else toast('곡을 가져왔어요');
}

// 이 브라우저 저장 공간이 거의 차면 (웹사이트) 백업·정리를 권한다.
// 저장이 끝날 때마다(화면 전체를 다시 그리지 않고) 이 자리만 고친다 — updateStorageWarn
function storageWarn() {
  const { storageUsage: u, saveFull } = getState();
  if (!saveFull && !(u && u.ratio >= WARN_AT)) return null;
  const pct = saveFull ? 100 : Math.min(99, Math.round(u.ratio * 100));
  return h('p', { class: 'warn small', id: 'storage-warn' }, `이 브라우저 저장 공간을 약 ${pct}% 썼어요. 꽉 차면 더 저장되지 않으니, 전체 백업을 받은 뒤 안 쓰는 곡이나 오래된 버전을 지워 주세요.`);
}

export function updateStorageWarn() {
  document.getElementById('storage-slot')?.replaceChildren(...[storageWarn()].filter(Boolean));
}

export function backupSection() {
  return [
    h('div', { class: 'side-head' }, h('span', { class: 'field-label' }, '백업')),
    h('div', { id: 'storage-slot' }, storageWarn()),
    h('button', { type: 'button', class: 'btn small', id: 'backup-all', disabled: ui.busy, onclick: downloadBackup }, ui.busy ? '만드는 중…' : '전체 백업 받기'),
    h('p', { class: 'muted small' }, '모든 곡(버전 포함)·앨범·취향을 파일 하나로 받아요. 마스터·커버 파일은 빠져요. 되살릴 때는 위의 "가져오기"에 넣으면 되고, 지금 것을 덮어쓰지 않아요.'),
  ];
}
