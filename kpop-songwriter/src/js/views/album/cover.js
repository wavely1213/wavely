// 앨범 > 커버: 템플릿으로 3000×3000 커버 만들기 또는 이미지 올리기.
import { h, toast, afterBlur } from '../../dom.js';
import { mutateAlbum, refresh } from '../../state.js';
import { TEMPLATES, PALETTES, COVER_SIZE, drawCover, canvasToJpeg, ensureFonts, imageSize } from '../../album/cover.js';
import { coverOf, setCover } from '../../album/session.js';
import { saveFile } from '../../platform/download.js';

const ui = { busy: false };

async function useTemplate(album) {
  ui.busy = true;
  refresh();
  try {
    await ensureFonts();
    const canvas = drawCover(document.createElement('canvas'), {
      title: album.title, artist: album.artist || 'Artist', subtitle: album.cover.subtitle, template: album.cover.template, palette: album.cover.palette,
    });
    const blob = await canvasToJpeg(canvas);
    setCover(album.id, { blob, width: COVER_SIZE, height: COVER_SIZE, source: 'template' });
  } finally {
    ui.busy = false;
    refresh();
  }
}

async function upload(album, file) {
  try {
    const size = await imageSize(file);
    setCover(album.id, { blob: file, width: size.width, height: size.height, source: 'upload', name: file.name });
    if (size.width !== size.height || size.width < 3000) toast(`${size.width}×${size.height} — 정사각형 3000×3000을 권해요`);
  } catch {
    toast('이미지를 읽지 못했어요. JPG나 PNG로 넣어 주세요');
  }
  refresh();
}

export function renderCover(album) {
  const cover = coverOf(album.id);
  // 미리보기용 작은 캔버스 (실제 내보내기는 3000px로 다시 그린다)
  const preview = h('canvas', { class: 'cover-preview', 'aria-label': '커버 미리보기' });
  ensureFonts().then(() => {
    drawCover(preview, { title: album.title, artist: album.artist || 'Artist', subtitle: album.cover.subtitle, template: album.cover.template, palette: album.cover.palette });
  });
  const file = h('input', { type: 'file', id: 'cover-file', accept: 'image/jpeg,image/png', class: 'visually-hidden', onchange: (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) upload(album, f);
  } });

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, '커버 만들기'),
      h('div', { class: 'cover-layout' },
        h('div', { class: 'stack-tight' },
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, '모양'),
            h('div', { class: 'chips' }, Object.entries(TEMPLATES).map(([k, name]) => h('button', {
              type: 'button', class: `chip${album.cover.template === k ? ' on' : ''}`, 'aria-pressed': album.cover.template === k ? 'true' : 'false',
              onclick: () => mutateAlbum((a) => { a.cover.template = k; }),
            }, name)))),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, '색'),
            h('div', { class: 'chips' }, PALETTES.map((p, i) => h('button', {
              type: 'button', class: `chip swatch${album.cover.palette === i ? ' on' : ''}`, 'aria-pressed': album.cover.palette === i ? 'true' : 'false',
              style: `--sw1:${p.colors[0]};--sw2:${p.colors[2]}`,
              onclick: () => mutateAlbum((a) => { a.cover.palette = i; }),
            }, p.name)))),
          h('label', { class: 'field' }, h('span', { class: 'field-label' }, '작은 글씨 (선택)'),
            h('input', { id: 'cover-sub', value: album.cover.subtitle, placeholder: '예: 1st Mini Album', oninput: (e) => mutateAlbum((a) => { a.cover.subtitle = e.target.value; }, 'quiet'), onchange: afterBlur(() => mutateAlbum(() => {})) })),
          h('p', { class: 'muted' }, '제목·아티스트는 정보 탭 값을 써요.'),
          h('div', { class: 'row' },
            h('button', { type: 'button', class: 'btn primary', disabled: ui.busy, onclick: () => useTemplate(album) }, ui.busy ? '만드는 중…' : '이 커버 쓰기 (3000×3000)'),
            file,
            h('label', { for: 'cover-file', class: 'btn' }, '내 이미지 올리기'))),
        preview)),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, '지금 쓰는 커버'),
        cover ? h('button', { type: 'button', class: 'btn small', onclick: async () => {
          const res = await saveFile(`${album.title || 'cover'}_cover.${cover.source === 'upload' && /png$/i.test(cover.name || '') ? 'png' : 'jpg'}`, cover.blob);
          if (res === 'unavailable') toast('이 화면에서는 파일을 받을 수 없어요');
        } }, '커버 받기') : null),
      cover
        ? h('div', { class: 'row' },
          h('img', { src: cover.url, class: 'cover-thumb', alt: '선택한 커버' }),
          h('p', { class: 'muted' }, `${cover.width}×${cover.height} · ${cover.source === 'template' ? '템플릿' : '올린 이미지'}${cover.width === cover.height && cover.width >= 3000 ? ' · 규격 OK' : ' · 3000×3000 정사각형 권장'}`))
        : h('p', { class: 'empty' }, '아직 정하지 않았어요. 위에서 "이 커버 쓰기"를 누르거나 이미지를 올려 주세요. (이미지는 새로고침하면 다시 정해야 해요)')),
  );
}
