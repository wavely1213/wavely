// 앨범 > 홍보: 트랙리스트 이미지 (SNS). 수록곡 순서·타이틀곡을 1080×1350 PNG로 받는다.
import { h, toast } from '../../dom.js';
import { coverBitmap } from '../../album/session.js';
import { ALBUM_TYPES } from '../../album/model.js';
import { drawTracklistCard } from '../../album/tracklistcard.js';
import { ensureCardFonts } from '../../album/lyriccard.js';
import { saveFile } from '../../platform/download.js';

const clean = (t) => String(t || '').replace(/^예시:\s*/, '');

export function renderTracklistCard(album, songs) {
  const tracks = album.tracks.map((t) => ({ t, s: songs.find((x) => x.id === t.songId) })).filter((x) => x.s)
    .map(({ t, s }) => ({ title: clean(s.title), isTitle: t.isTitle }));
  if (tracks.length < 2) return null;
  const opts = {
    title: album.title, artist: album.artist, palette: album.cover.palette, tracks,
    sub: [ALBUM_TYPES[album.type]?.name, album.releaseDate].filter(Boolean).join(' · '),
  };
  const glyphs = [opts.title, opts.artist, opts.sub, ...tracks.map((x) => x.title), 'TITLE 0123456789'].join(' ');
  const preview = h('canvas', { class: 'card-preview', id: 'tracklist-preview', role: 'img', 'aria-label': `트랙리스트 미리보기: ${tracks.map((x, i) => `${i + 1}. ${x.title}`).join(', ')}` });
  (async () => { await ensureCardFonts(glyphs); drawTracklistCard(preview, { ...opts, image: await coverBitmap(album.id) }, 0.3); })();
  const download = async () => {
    try {
      await ensureCardFonts(glyphs);
      const c = drawTracklistCard(document.createElement('canvas'), { ...opts, image: await coverBitmap(album.id) });
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      const res = await saveFile(`${(album.title || 'album').replace(/[\\/:*?"<>|]+/g, '').trim() || 'album'}_트랙리스트.png`, blob);
      if (res === 'saved') toast('받았어요');
      else if (res === 'unavailable') toast('이 화면에서는 파일을 받을 수 없어요');
    } catch {
      toast('이미지를 만들지 못했어요');
    }
  };
  return h('section', { class: 'card', id: 'tracklist-card' },
    h('h2', null, '트랙리스트 이미지 (SNS)'),
    h('p', { class: 'muted small' }, '수록곡 순서와 타이틀곡을 커버 위에 얹은 1080×1350 이미지예요. 순서를 바꾸면 이미지도 바뀌어요.'),
    preview,
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary', id: 'tl-download', onclick: download }, 'PNG 받기')));
}
