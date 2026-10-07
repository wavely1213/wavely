// 트랙리스트 이미지: SNS(4:5)용 1080×1350. 가사 카드와 같은 배경 + 앨범 제목·아티스트 + 번호·곡 제목(타이틀곡 표시).
import { CARD_W, CARD_H, BODY, MONO, cardBackground, wrapLine } from './lyriccard.js';

const PAD = 110;

// 한 줄에 안 들어가면 끝을 줄임표로
export function fitOne(measure, text, maxW) {
  if (measure(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && measure(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

// opts: { title, artist, sub(앨범 종류·발매일), tracks: [{ title, isTitle }], image, palette }
export function drawTracklistCard(canvas, { title, artist, sub = '', tracks, image = null, palette = 0 }, scale = 1) {
  const { ctx, accent, textColor } = cardBackground(canvas, { image, palette }, scale);
  ctx.textBaseline = 'top';
  ctx.fillStyle = textColor;
  // 머리: 앨범 제목(두 줄까지) · 아티스트 · 종류·날짜
  ctx.font = `700 64px ${BODY}`;
  const head = wrapLine((t) => ctx.measureText(t).width, title, CARD_W - PAD * 2).slice(0, 2);
  head.forEach((l, i) => ctx.fillText(l, PAD, PAD + i * 80));
  let y = PAD + head.length * 80 + 10;
  ctx.font = `600 32px ${MONO}`;
  ctx.fillText(artist, PAD, y);
  if (sub) { ctx.globalAlpha = 0.75; ctx.font = `600 26px ${MONO}`; ctx.fillText(sub, PAD, y + 48); ctx.globalAlpha = 1; }
  y += 120;
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, y, 72, 8);
  y += 50;
  // 목록: 남은 높이에 곡 수만큼 줄 높이를 나눈다
  const rowH = Math.min(96, (CARD_H - PAD - y) / Math.max(1, tracks.length));
  const size = Math.max(26, Math.min(46, Math.round(rowH * 0.5)));
  tracks.forEach((t, i) => {
    const top = y + i * rowH;
    ctx.font = `600 ${Math.round(size * 0.8)}px ${MONO}`;
    ctx.fillStyle = accent;
    ctx.fillText(String(i + 1).padStart(2, '0'), PAD, top + size * 0.12);
    ctx.font = `700 ${size}px ${BODY}`;
    ctx.fillStyle = textColor;
    const tag = t.isTitle ? 'TITLE' : '';
    const tagW = tag ? (ctx.font = `600 ${Math.round(size * 0.5)}px ${MONO}`, ctx.measureText(tag).width + 28) : 0;
    ctx.font = `700 ${size}px ${BODY}`;
    const x = PAD + size * 1.9;
    const name = fitOne((s) => ctx.measureText(s).width, t.title, CARD_W - PAD - x - tagW);
    ctx.fillText(name, x, top);
    if (tag) {
      const nx = x + ctx.measureText(name).width + 16;
      ctx.font = `600 ${Math.round(size * 0.5)}px ${MONO}`;
      ctx.fillStyle = accent;
      ctx.fillText(tag, nx, top + size * 0.3);
      ctx.fillStyle = textColor;
    }
  });
  ctx.textBaseline = 'alphabetic';
  return canvas;
}
