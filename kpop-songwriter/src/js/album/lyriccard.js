// 가사 카드: SNS(4:5)용 1080×1350 이미지. 커버를 흐리고 어둡게 깐 배경(없으면 앨범 색) + 가사 몇 줄 + 곡 제목·아티스트.
import { PALETTES } from './cover.js';

export const CARD_W = 1080;
export const CARD_H = 1350;
const BODY = '"IBM Plex Sans KR", "Apple SD Gothic Neo", sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const PAD = 110;

// 한 줄을 maxW 안에 들게 나눈다: 빈칸에서 먼저, 빈칸 없이 긴 말은 글자 단위로
export function wrapLine(measure, text, maxW) {
  const out = [];
  let cur = '';
  const push = (w) => {
    const next = cur ? `${cur} ${w}` : w;
    if (measure(next) <= maxW) { cur = next; return; }
    if (cur) out.push(cur);
    cur = '';
    if (measure(w) <= maxW) { cur = w; return; }
    let piece = '';
    for (const ch of w) {
      if (measure(piece + ch) > maxW && piece) { out.push(piece); piece = ch; } else piece += ch;
    }
    cur = piece;
  };
  text.split(/\s+/).filter(Boolean).forEach(push);
  if (cur) out.push(cur);
  return out;
}

// 가사 줄들이 상자에 들어가는 가장 큰 글자 크기와 화면 줄들
export function layoutLyrics(measureAt, lines, maxW, maxH, { from = 76, to = 34 } = {}) {
  for (let size = from; size >= to; size -= 2) {
    const m = (t) => measureAt(size, t);
    const rows = lines.flatMap((l) => wrapLine(m, l, maxW));
    if (rows.length * size * 1.5 <= maxH) return { size, rows };
  }
  const m = (t) => measureAt(to, t);
  return { size: to, rows: lines.flatMap((l) => wrapLine(m, l, maxW)) };
}

// opts: { lines, title, artist, image(그릴 수 있는 이미지)|null, palette }. scale: 미리보기는 작게(좌표는 1080 기준)
export function drawLyricCard(canvas, { lines, title, artist, image = null, palette = 0 }, scale = 1) {
  canvas.width = Math.round(CARD_W * scale);
  canvas.height = Math.round(CARD_H * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  const [bg1, bg2, accent, ink] = (PALETTES[palette] || PALETTES[0]).colors;
  let textColor = ink;
  if (image) {
    const k = Math.max(CARD_W / image.width, CARD_H / image.height) * 1.1; // 흐림 가장자리가 안 보이게 조금 크게
    ctx.filter = 'blur(28px)';
    ctx.drawImage(image, (CARD_W - image.width * k) / 2, (CARD_H - image.height * k) / 2, image.width * k, image.height * k);
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // 흐림을 못 쓰는 브라우저에서도 글자가 읽히게 어둡게
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    textColor = '#ffffff';
  } else {
    const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    g.addColorStop(0, bg1);
    g.addColorStop(1, bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }
  const clean = lines.map((l) => l.trim()).filter(Boolean);
  const measureAt = (size, t) => { ctx.font = `700 ${size}px ${BODY}`; return ctx.measureText(t).width; };
  const { size, rows } = layoutLyrics(measureAt, clean, CARD_W - PAD * 2, CARD_H - 520);
  const lh = size * 1.5;
  const top = (CARD_H - rows.length * lh) / 2 - 40;
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, top - 56, 72, 8);
  ctx.font = `700 ${size}px ${BODY}`;
  ctx.fillStyle = textColor;
  ctx.textBaseline = 'top';
  rows.forEach((r, i) => ctx.fillText(r, PAD, top + i * lh));
  ctx.font = `600 30px ${MONO}`;
  ctx.fillStyle = textColor;
  ctx.globalAlpha = 0.85;
  const credit = [title && `「${title}」`, artist].filter(Boolean).join('  ');
  ctx.fillText(credit, PAD, CARD_H - PAD - 30);
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
  return canvas;
}

export async function ensureCardFonts() {
  try {
    await Promise.all([document.fonts.load(`700 60px ${BODY}`, '가A'), document.fonts.load(`600 30px ${MONO}`, 'A')]);
  } catch { /* 대체 글꼴로 그린다 */ }
}
