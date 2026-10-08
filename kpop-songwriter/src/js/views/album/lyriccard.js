// 앨범 > 홍보: 가사 카드 (SNS 이미지). 곡과 가사 줄을 골라 1080×1350 PNG로 받는다.
import { h, toast } from '../../dom.js';
import { refresh } from '../../state.js';
import { lyricLines } from '../../album/lyrics.js';
import { coverBitmap } from '../../album/session.js';
import { drawLyricCard, ensureCardFonts } from '../../album/lyriccard.js';
import { saveFile } from '../../platform/download.js';

const byAlbum = {}; // 앨범마다 고른 곡·줄 (화면 메모리에만)

// 처음엔 첫 코러스의 첫 줄부터 (킬링 파트일 가능성이 큼)
function defaultStart(song, lines) {
  const chorus = song.sections.find((s) => s.type === 'Chorus' && s.text.trim());
  const first = chorus?.text.split('\n').map((l) => l.trim()).find(Boolean);
  return Math.max(0, first ? lines.indexOf(first) : 0);
}

const clean = (t) => t.replace(/^예시:\s*/, '');

export function renderLyricCard(album, songs) {
  const tracks = album.tracks.map((t) => songs.find((s) => s.id === t.songId)).filter((s) => s && lyricLines(s).length);
  if (!tracks.length) return null;
  const ui = byAlbum[album.id] || (byAlbum[album.id] = { songId: '', start: -1, count: 2 });
  const song = tracks.find((s) => s.id === ui.songId) || tracks[0];
  const lines = lyricLines(song);
  if (ui.songId !== song.id || ui.start < 0 || ui.start >= lines.length) { ui.songId = song.id; ui.start = defaultStart(song, lines); }
  const picked = lines.slice(ui.start, ui.start + ui.count);
  const opts = { lines: picked, title: clean(song.title), artist: album.artist, palette: album.cover.palette };
  const preview = h('canvas', { class: 'card-preview', id: 'lyric-card-preview', role: 'img', 'aria-label': `가사 카드 미리보기: ${picked.join(' / ')}` });
  const glyphs = [...picked, opts.title, opts.artist].join(' ');
  (async () => { await ensureCardFonts(glyphs); drawLyricCard(preview, { ...opts, image: await coverBitmap(album.id) }, 0.3); })();
  const download = async () => {
    try {
      await ensureCardFonts(glyphs);
      const c = drawLyricCard(document.createElement('canvas'), { ...opts, image: await coverBitmap(album.id) });
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      const res = await saveFile(`${opts.title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'lyrics'}_가사카드.png`, blob);
      if (res === 'saved') toast('받았어요');
      else if (res === 'unavailable') toast('이 화면에서는 파일을 받을 수 없어요');
    } catch {
      toast('이미지를 만들지 못했어요');
    }
  };
  return h('section', { class: 'card', id: 'lyric-card' },
    h('h2', null, '가사 카드 (SNS 이미지)'),
    h('p', { class: 'muted small' }, '가사 몇 줄을 커버 위에 얹은 1080×1350 이미지예요. 티저·발매 공지와 함께 올려요. 커버가 없으면 앨범 색으로 그려요.'),
    h('div', { class: 'row' },
      tracks.length > 1 ? h('select', { id: 'lc-song', 'aria-label': '가사 카드에 쓸 곡', onchange: (e) => { ui.songId = e.target.value; ui.start = -1; refresh(); } },
        tracks.map((s) => h('option', { value: s.id, selected: s.id === song.id }, clean(s.title)))) : null,
      h('select', { id: 'lc-start', 'aria-label': '가사 카드 첫 줄', onchange: (e) => { ui.start = Number(e.target.value); refresh(); } },
        lines.map((l, i) => h('option', { value: String(i), selected: i === ui.start }, l.length > 30 ? `${l.slice(0, 30)}…` : l))),
      h('select', { id: 'lc-count', 'aria-label': '가사 카드 줄 수', onchange: (e) => { ui.count = Number(e.target.value); refresh(); } },
        [1, 2, 3, 4].map((n) => h('option', { value: String(n), selected: n === ui.count }, `${n}줄`)))),
    preview,
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary', id: 'lc-download', onclick: download }, 'PNG 받기')));
}
