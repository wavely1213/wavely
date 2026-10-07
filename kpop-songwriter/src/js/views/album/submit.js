// 앨범 > 제출: 발매 전 점검표 + 유통사 제출 패키지(zip) 받기.
import { h, toast } from '../../dom.js';
import { refresh, getState, setAlbumTab } from '../../state.js';
import { releaseChecklist } from '../../album/model.js';
import { buildReleasePackage } from '../../album/release.js';
import { mastersOf, coverOf, fillFromSongMasters } from '../../album/session.js';
import { saveFile } from '../../platform/download.js';

const ui = { busy: '' };
const LEVEL = { error: '꼭 고치기', warn: '확인', info: '참고' };

async function download(album) {
  const { songs } = getState();
  ui.busy = '준비 중';
  refresh();
  try {
    const { blob, filename } = await buildReleasePackage(album, songs, mastersOf(album.id), coverOf(album.id), (t) => {
      ui.busy = t;
      const el = document.getElementById('submit-status');
      if (el) el.textContent = t;
    });
    ui.busy = '저장 확인 창을 확인해 주세요';
    refresh();
    const res = await saveFile(filename, blob);
    if (res === 'saved') toast('받았어요');
    else if (res === 'unavailable') toast('이 화면에서는 파일을 받을 수 없어요');
  } catch {
    toast('패키지를 만들지 못했어요. 다시 눌러 주세요');
  } finally {
    ui.busy = '';
    refresh();
  }
}

export function renderSubmit(album) {
  const { songs } = getState();
  fillFromSongMasters(album);
  const items = releaseChecklist(album, songs, { masters: mastersOf(album.id), coverInfo: coverOf(album.id) });
  const errors = items.filter((i) => i.level === 'error').length;
  const warns = items.filter((i) => i.level === 'warn').length;
  const jump = (text) => {
    if (/마스터|WAV|샘플레이트|비트|피크|음량|수록곡|타이틀/.test(text)) return 'tracks';
    if (/커버/.test(text)) return 'cover';
    if (/발매일|발매 예정일/.test(text)) return 'schedule';
    return 'meta';
  };
  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, '발매 전 점검'),
        h('span', { class: `pill ${errors || warns ? 'warn-pill' : 'good'}` }, errors ? `꼭 고칠 것 ${errors}개` : warns ? `확인 ${warns}개` : '제출 준비 완료')),
      items.length
        ? h('ul', { class: 'checklist' }, items.map((i) => h('li', { class: `lv-${i.level}` },
          h('span', { class: 'lv' }, LEVEL[i.level]),
          h('span', { class: 'ck-text' }, i.text),
          i.level !== 'info' ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => setAlbumTab(jump(i.text)) }, '고치러 가기') : null)))
        : h('p', { class: 'empty' }, '점검 항목이 없어요.')),
    h('section', { class: 'card' },
      h('h2', null, '유통사 제출 패키지'),
      h('p', { class: 'muted' }, '마스터 WAV(트랙 번호 순 파일명), 커버, 메타데이터 CSV, 가사, 크레딧, 일정표, 점검 결과, 홍보 문구를 zip 하나로 받아요. 유통사 업로드 화면에 이 값들을 옮겨 적으면 돼요.'),
      errors ? h('p', { class: 'warn' }, '꼭 고칠 항목이 남아 있어요. 패키지는 받을 수 있지만 그대로 제출하면 반려될 수 있어요.') : null,
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn primary', disabled: !!ui.busy || !album.tracks.length, onclick: () => download(album) }, '제출 패키지 받기 (zip)'),
        ui.busy ? h('span', { class: 'status' }, h('span', { class: 'dot' }), h('span', { id: 'submit-status' }, ui.busy)) : null)),
  );
}
