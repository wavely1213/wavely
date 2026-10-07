// 마스터링 탭: 가사 맞춰 듣기. 완성곡을 들으며 줄마다 맞게 불렀는지 표시 (발매 전 점검표에 반영).
import { h } from '../dom.js';
import { mutateSong, refresh } from '../state.js';
import { lyricLines } from '../album/lyrics.js';
import { lyricCheckStatus, cycleLine, markAll } from '../album/lyriccheck.js';

const LABEL = { none: '아직 확인 안 함', partial: '확인 중', done: '모두 맞게 불렀음', off: '다르게 부른 줄 있음', stale: '가사가 바뀜 — 다시 확인' };

export function renderLyricCheck(song) {
  if (song.instOf) return null;
  const lines = lyricLines(song);
  if (!lines.length) return null;
  const status = lyricCheckStatus(song);
  const c = status === 'stale' ? { ok: [], off: [] } : (song.lyricCheck || { ok: [], off: [] });
  const ok = new Set(c.ok);
  const off = new Set(c.off);
  return h('section', { class: 'card', id: 'lyric-check' },
    h('div', { class: 'card-head' },
      h('h2', null, '가사 맞춰 듣기'),
      h('span', { class: `pill ${status === 'done' ? 'good' : 'warn-pill'}`, id: 'lyric-check-status' }, `${LABEL[status]} · ${ok.size}/${lines.length}줄`)),
    h('p', { class: 'muted small' }, 'Suno는 가사를 빼먹거나 바꿔 부르기도 해요. 완성곡을 들으며 줄을 눌러 표시하세요 (한 번: 맞음 ✓, 두 번: 다름 ✗, 세 번: 지움). 다르게 부른 줄은 가사를 부른 대로 고치거나 Suno에서 다시 만드세요 — 플랫폼 가사는 실제로 부른 대로여야 해요.'),
    h('ol', { class: 'check-lines' }, lines.map((l, i) => h('li', null,
      h('button', {
        type: 'button', class: `check-line${ok.has(i) ? ' ok' : off.has(i) ? ' off' : ''}`, id: `lc-line-${i}`,
        'aria-label': `${l} — ${ok.has(i) ? '맞게 불렀음' : off.has(i) ? '다르게 불렀음' : '표시 없음'}`,
        // 줄마다 되돌리기 단계가 쌓이지 않게 'quiet'로 저장하고 화면은 바로 다시 그림
        onclick: () => { mutateSong(song.id, (x) => cycleLine(x, i), 'quiet'); refresh(); },
      }, h('span', { class: 'check-mark', 'aria-hidden': 'true' }, ok.has(i) ? '✓' : off.has(i) ? '✗' : '·'), l)))),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn small', id: 'lc-all', onclick: () => mutateSong(song.id, markAll) }, '모두 맞게 불렀음')));
}
