// 가사집(디지털 부클릿): 커버·트랙 목록·곡마다 가사·크레딧을 인쇄용 HTML 한 장으로. 브라우저에서 열어 PDF로 인쇄한다.
import { ALBUM_TYPES } from './model.js';
import { plainLyrics } from './lyrics.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (t) => String(t || '').replace(/^예시:\s*/, '');

// coverDataUrl: 'data:image/jpeg;base64,...' 또는 '' (없으면 글자 표지)
export function bookletHtml(album, songs, coverDataUrl = '') {
  const tracks = album.tracks.map((t) => ({ t, s: songs.find((x) => x.id === t.songId) })).filter((x) => x.s);
  const credit = (t) => [
    t.lyricists && `작사 ${esc(t.lyricists)}`,
    t.composers && `작곡 ${esc(t.composers)}`,
    t.arrangers && `편곡 ${esc(t.arrangers)}`,
    t.featuring && `Feat. ${esc(t.featuring)}`,
  ].filter(Boolean).join(' · ');
  const lyricHtml = (s) => {
    const text = plainLyrics(s);
    return text ? text.split('\n\n').map((block) => `<p>${block.split('\n').map(esc).join('<br>')}</p>`).join('') : '';
  };
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(album.artist)} - ${esc(album.title)} 가사집</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; color: #111; line-height: 1.7; }
  .page { break-after: page; page-break-after: always; padding: 8mm 0; max-width: 170mm; margin: 0 auto; }
  .page:last-child { break-after: auto; page-break-after: auto; }
  .cover { text-align: center; }
  .cover img { width: 100%; max-width: 150mm; aspect-ratio: 1; object-fit: cover; }
  .cover .plain { width: 100%; max-width: 150mm; aspect-ratio: 1; margin: 0 auto; display: grid; place-content: center; background: #111; color: #fff; font-size: 28pt; font-weight: 800; }
  h1 { font-size: 22pt; margin: 10mm 0 2mm; }
  h2 { font-size: 16pt; margin: 0 0 1mm; }
  .sub { color: #666; font-size: 10pt; }
  ol.list { font-size: 12pt; padding-left: 8mm; display: inline-block; text-align: left; margin: 6mm auto 0; }
  .lyrics p { margin: 0 0 5mm; font-size: 11pt; }
  .credit { color: #555; font-size: 9pt; margin-bottom: 6mm; }
  .tail { color: #555; font-size: 9pt; }
  @media screen { body { background: #eee; } .page { background: #fff; margin: 12px auto; padding: 18mm; box-shadow: 0 1px 4px rgba(0,0,0,.15); } .hint { text-align: center; color: #555; font-size: 13px; padding: 12px 16px 0; } }
  @media print { .hint { display: none; } }
</style></head><body>
<p class="hint">브라우저의 인쇄(Ctrl/⌘+P) → "PDF로 저장"을 고르면 가사집 PDF가 돼요.</p>
<section class="page cover">
  ${coverDataUrl ? `<img src="${esc(coverDataUrl)}" alt="커버">` : `<div class="plain">${esc(album.title)}</div>`}
  <h1>${esc(album.title)}</h1>
  <div class="sub">${esc(album.artist)} · ${esc(ALBUM_TYPES[album.type]?.name || '')}${album.releaseDate ? ` · ${esc(album.releaseDate)}` : ''}</div>
  <ol class="list">${tracks.map(({ t, s }) => `<li>${esc(clean(s.title))}${t.isTitle ? ' <span class="sub">(타이틀)</span>' : ''}</li>`).join('')}</ol>
</section>
${tracks.map(({ t, s }, i) => `<section class="page lyrics">
  <h2>${i + 1}. ${esc(clean(s.title))}</h2>
  <div class="credit">${credit(t)}</div>
  ${lyricHtml(s) || '<p class="sub">(연주곡)</p>'}
</section>`).join('\n')}
<section class="page tail">
  <p>${album.cLine ? `© ${esc(album.cLine)}` : ''}${album.pLine ? `<br>℗ ${esc(album.pLine)}` : ''}</p>
</section>
</body></html>
`;
}

// Blob → data URL (커버를 가사집 안에 넣기 위해)
export function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => resolve('');
    r.readAsDataURL(blob);
  });
}
