// 발매 일정 → 캘린더 파일(.ics). 날짜마다 하루 종일 일정 + 그날 아침 9시 알림. 폰·PC 캘린더에서 열면 들어간다.
import { scheduleFor } from './model.js';

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// 한 줄 75바이트마다 접는다 (RFC 5545). 한글이 깨지지 않게 글자 단위로 자른다.
export function fold(line) {
  const enc = new TextEncoder();
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

const ymd = (iso) => iso.replace(/-/g, '');
const nextDay = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return t.toISOString().slice(0, 10);
};

// 끝낸 일정은 빼고(opts.includeDone이면 포함), 발매일이 없으면 null
export function scheduleIcs(album, { now = new Date(), includeDone = false } = {}) {
  const items = scheduleFor(album).filter((s) => s.date && (includeDone || !s.done));
  if (!album.releaseDate || !items.length) return null;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const name = album.title || '새 앨범';
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//kpop-songwriter//release schedule//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(`${name} 발매 일정`)}`,
  ];
  items.forEach((s) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${album.id}-${s.id}@kpop-songwriter`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(s.date)}`,
      `DTEND;VALUE=DATE:${ymd(nextDay(s.date))}`,
      `SUMMARY:${esc(`[${name}] ${s.title} (D${s.offset >= 0 ? '+' : ''}${s.offset})`)}`,
      `DESCRIPTION:${esc(s.detail)}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(s.title)}`, 'TRIGGER:PT9H', 'END:VALARM',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
