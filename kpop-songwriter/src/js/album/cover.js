// 앨범 커버 템플릿: 3000×3000 캔버스에 그려 JPG로 내보낸다.

export const COVER_SIZE = 3000;

// [배경1, 배경2, 포인트, 글자]
export const PALETTES = [
  { name: '새벽', colors: ['#0f1033', '#3b1f6b', '#ff5c9d', '#f4f1ff'] },
  { name: '복숭아', colors: ['#ffd6c9', '#ff9eb1', '#ff4f6d', '#2b1020'] },
  { name: '민트', colors: ['#d8fff1', '#7fe0c9', '#0f8f7a', '#0c2b27'] },
  { name: '흑백', colors: ['#111111', '#2b2b2b', '#e8e8e8', '#ffffff'] },
  { name: '네온', colors: ['#050505', '#1a0533', '#39ff88', '#f5f5f5'] },
  { name: '노을', colors: ['#ff7a3d', '#7a2c8f', '#ffd36b', '#fff7ea'] },
];

export const TEMPLATES = {
  gradient: '그라데이션',
  circle: '원',
  minimal: '미니멀',
  type: '큰 글씨',
};

// 길이에 맞춰 글자 크기를 줄이고 공백에서 줄을 나눈다
function fitText(ctx, text, maxWidth, startSize, font, maxLines = 3) {
  let size = startSize;
  const words = text.split(/\s+/).filter(Boolean);
  while (size > 60) {
    ctx.font = `${size}px ${font}`;
    const lines = [];
    let line = '';
    words.forEach((w) => {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = w; } else line = next;
    });
    if (line) lines.push(line);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxWidth)) return { size, lines };
    size -= 20;
  }
  ctx.font = `${size}px ${font}`;
  return { size, lines: [text] };
}

function grain(ctx, amount) {
  const tile = document.createElement('canvas');
  tile.width = 300;
  tile.height = 300;
  const t = tile.getContext('2d');
  const img = t.createImageData(300, 300);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = amount;
  }
  t.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.fillRect(0, 0, COVER_SIZE, COVER_SIZE);
  ctx.restore();
}

const DISPLAY = '"Black Han Sans", "IBM Plex Sans KR", sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

export async function ensureFonts() {
  try {
    await Promise.all([document.fonts.load(`200px ${DISPLAY}`, '가A'), document.fonts.load(`80px ${MONO}`, 'A')]);
  } catch { /* 대체 글꼴로 그린다 */ }
}

// opts: { title, artist, subtitle, template, palette }
export function drawCover(canvas, { title, artist, subtitle, template = 'gradient', palette = 0 }) {
  const S = COVER_SIZE;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  const [bg1, bg2, accent, ink] = (PALETTES[palette] || PALETTES[0]).colors;
  const pad = 220;
  ctx.textBaseline = 'alphabetic';

  if (template === 'gradient') {
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, bg1); g.addColorStop(1, bg2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    const r = ctx.createRadialGradient(S * 0.75, S * 0.3, 0, S * 0.75, S * 0.3, S * 0.6);
    r.addColorStop(0, `${accent}aa`); r.addColorStop(1, `${accent}00`);
    ctx.fillStyle = r; ctx.fillRect(0, 0, S, S);
    grain(ctx, 40);
    const t = fitText(ctx, title, S - pad * 2, 420, DISPLAY);
    ctx.fillStyle = ink;
    t.lines.forEach((l, i) => ctx.fillText(l, pad, S - pad - (t.lines.length - 1 - i) * t.size * 1.05 - (subtitle ? 140 : 0)));
    if (subtitle) { ctx.font = `90px ${MONO}`; ctx.fillStyle = accent; ctx.fillText(subtitle, pad, S - pad); }
    ctx.font = `100px ${MONO}`; ctx.fillStyle = ink; ctx.fillText(artist, pad, pad + 100);
  } else if (template === 'circle') {
    ctx.fillStyle = bg1; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(S / 2, S * 0.42, S * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.arc(S / 2 + S * 0.09, S * 0.42 - S * 0.05, S * 0.22, 0, Math.PI * 2); ctx.fill();
    grain(ctx, 30);
    ctx.textAlign = 'center';
    const t = fitText(ctx, title, S - pad * 2, 300, DISPLAY, 2);
    ctx.fillStyle = ink;
    t.lines.forEach((l, i) => ctx.fillText(l, S / 2, S * 0.86 - (t.lines.length - 1 - i) * t.size * 1.05));
    ctx.font = `90px ${MONO}`; ctx.fillText(artist + (subtitle ? `  ·  ${subtitle}` : ''), S / 2, S - 180);
    ctx.textAlign = 'left';
  } else if (template === 'minimal') {
    ctx.fillStyle = bg1; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = accent; ctx.lineWidth = 14;
    ctx.strokeRect(pad, pad, S - pad * 2, S - pad * 2);
    ctx.fillStyle = ink; ctx.textAlign = 'center';
    const t = fitText(ctx, title, S - pad * 4, 220, DISPLAY, 2);
    t.lines.forEach((l, i) => ctx.fillText(l, S / 2, S / 2 + (i - (t.lines.length - 1) / 2) * t.size * 1.1 + t.size * 0.35));
    ctx.font = `80px ${MONO}`; ctx.fillStyle = accent;
    ctx.fillText(artist.toUpperCase(), S / 2, S - pad - 120);
    if (subtitle) ctx.fillText(subtitle, S / 2, pad + 200);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = accent; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = bg1;
    const t = fitText(ctx, title, S - 160, 900, DISPLAY, 4);
    t.lines.forEach((l, i) => ctx.fillText(l, 80, 80 + t.size * 0.9 + i * t.size * 0.95));
    grain(ctx, 35);
    ctx.font = `110px ${MONO}`; ctx.fillStyle = ink === '#ffffff' || ink === '#f5f5f5' ? bg1 : ink;
    ctx.fillText(artist, 80, S - 120);
    if (subtitle) { ctx.textAlign = 'right'; ctx.fillText(subtitle, S - 80, S - 120); ctx.textAlign = 'left'; }
  }
  return canvas;
}

export function canvasToJpeg(canvas, quality = 0.92) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

// 사용자가 올린 이미지 크기 읽기
export function imageSize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { reject(new Error('image')); URL.revokeObjectURL(url); };
    img.src = url;
  });
}
