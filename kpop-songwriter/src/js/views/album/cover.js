// 앨범 > 커버: 템플릿으로 3000×3000 커버 만들기 또는 이미지 올리기.
import { h, toast, afterBlur } from '../../dom.js';
import { mutateAlbum, refresh, getState } from '../../state.js';
import { coverMoods, suggestCover } from '../../album/coverpick.js';
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
    // 그릴 때의 제목·아티스트를 기억해 두었다가, 나중에 정보가 바뀌면 점검표가 알려 준다
    setCover(album.id, { blob, width: COVER_SIZE, height: COVER_SIZE, source: 'template', drawnWith: { title: album.title, artist: album.artist } });
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

// 컨셉(타이틀곡 분위기)에 맞는 모양·색 한 번에 고르기
function renderSuggest(album) {
  const moods = coverMoods(album, getState().songs);
  const sg = suggestCover(moods);
  if (!sg) return null;
  const same = album.cover.template === sg.template && album.cover.palette === sg.palette;
  return h('div', { class: 'row' },
    h('button', { type: 'button', class: 'btn small', id: 'cover-suggest', disabled: same, onclick: () => mutateAlbum((a) => { a.cover.template = sg.template; a.cover.palette = sg.palette; }) },
      same ? '분위기에 맞춰 골랐어요' : '분위기에 맞게 고르기'),
    h('span', { class: 'muted small' }, `${sg.moods.join('·')} → ${PALETTES[sg.palette].name} · ${TEMPLATES[sg.template]}`));
}

// 모양마다 지금 색으로 작게 그려 한눈에 비교 (누르면 그 모양)
function renderThumbs(album) {
  return h('div', { class: 'cover-thumbs', role: 'group', 'aria-label': '모양 한눈에 보기' }, Object.entries(TEMPLATES).map(([k, name]) => {
    const c = h('canvas', { class: 'cover-mini', 'aria-hidden': 'true' });
    ensureFonts().then(() => drawCover(c, { title: album.title, artist: album.artist || 'Artist', subtitle: album.cover.subtitle, template: k, palette: album.cover.palette }, 240));
    return h('button', { type: 'button', class: `cover-mini-btn${album.cover.template === k ? ' on' : ''}`, 'aria-pressed': album.cover.template === k ? 'true' : 'false', 'aria-label': `${name} 모양`, onclick: () => mutateAlbum((a) => { a.cover.template = k; }) }, c, h('span', { class: 'small' }, name));
  }));
}

export function renderCover(album) {
  const cover = coverOf(album.id);
  // 미리보기용 작은 캔버스 (실제 내보내기는 3000px로 다시 그린다)
  const preview = h('canvas', { class: 'cover-preview', 'aria-label': '커버 미리보기' });
  ensureFonts().then(() => {
    drawCover(preview, { title: album.title, artist: album.artist || 'Artist', subtitle: album.cover.subtitle, template: album.cover.template, palette: album.cover.palette }, 600); // 미리보기는 작게
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
          renderSuggest(album),
          h('p', { class: 'muted' }, '제목·아티스트는 정보 탭 값을 써요.'),
          h('div', { class: 'row' },
            h('button', { type: 'button', class: 'btn primary', disabled: ui.busy, onclick: () => useTemplate(album) }, ui.busy ? '만드는 중…' : '이 커버 쓰기 (3000×3000)'),
            file,
            h('label', { for: 'cover-file', class: 'btn' }, '내 이미지 올리기'))),
        preview),
      renderThumbs(album)),
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
        : h('p', { class: 'empty' }, '아직 정하지 않았어요. 위에서 "이 커버 쓰기"를 누르거나 이미지를 올려 주세요.')),
  );
}
