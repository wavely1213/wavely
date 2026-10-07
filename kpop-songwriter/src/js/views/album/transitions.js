// 앨범 > 수록곡: 곡 사이 넘어가는 부분 듣기. 앞 곡 끝 6초 → 다음 곡 처음 6초를 이어 들어 흐름·음량 차이를 확인한다.
import { h, toast } from '../../dom.js';
import { refresh } from '../../state.js';
import { mastersOf } from '../../album/session.js';
import { EDGE_SECS, edgesOf, joinClips, transitionPairs } from '../../album/transition.js';
import { ALBUM_LOUDNESS_GAP } from '../../album/model.js';

const RATE = 44100;
const edgeCache = new WeakMap(); // 마스터 정보 객체 → { head, tail } (마스터를 바꾸면 새 객체라 다시 잰다)
const ui = { ctx: null, src: null, playing: '', loading: '' };

export function stopTransition() {
  try { ui.src?.stop(); } catch { /* 이미 멈춤 */ }
  ui.src = null;
  ui.playing = '';
}

// 마스터 파일 전체를 풀어 앞뒤 몇 초만 남긴다 (곡 전체 오디오는 들고 있지 않음)
async function edges(info) {
  if (!edgeCache.has(info)) {
    const off = new OfflineAudioContext(2, 1, RATE);
    const buf = await off.decodeAudioData(await info.file.arrayBuffer());
    const ch = Array.from({ length: buf.numberOfChannels }, (_, i) => buf.getChannelData(i));
    edgeCache.set(info, edgesOf(ch, RATE, EDGE_SECS));
  }
  return edgeCache.get(info);
}

async function play(album, pair) {
  const key = `${pair.from}>${pair.to}`;
  if (ui.playing === key) { stopTransition(); refresh(); return; }
  stopTransition();
  const m = mastersOf(album.id);
  ui.loading = key;
  refresh();
  try {
    const [a, b] = await Promise.all([edges(m[pair.from]), edges(m[pair.to])]);
    const clip = joinClips(a.tail, b.head, RATE);
    if (!ui.ctx) ui.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ui.ctx.state === 'suspended') await ui.ctx.resume();
    const buf = ui.ctx.createBuffer(2, clip[0].length, RATE);
    clip.forEach((c, i) => buf.copyToChannel(c, i));
    const src = ui.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ui.ctx.destination);
    src.onended = () => { if (ui.src === src) { ui.src = null; ui.playing = ''; refresh(); } };
    src.start();
    ui.src = src;
    ui.playing = key;
  } catch {
    toast('마스터 파일을 읽지 못했어요. 다시 넣어 주세요');
  } finally {
    ui.loading = '';
    refresh();
  }
}

export function renderTransitions(album, songs) {
  const pairs = transitionPairs(album.tracks, mastersOf(album.id));
  if (!pairs.length || !pairs.some((p) => p.ready)) return null;
  const title = (id) => (songs.find((s) => s.id === id)?.title || '').replace(/^예시:\s*/, '');
  return h('section', { class: 'card', id: 'transitions' },
    h('h2', null, '곡 사이 넘어가는 부분 듣기'),
    h('p', { class: 'muted small' }, `앞 곡 끝 ${EDGE_SECS}초와 다음 곡 처음 ${EDGE_SECS}초를 이어 들어요. 크기가 튀거나 분위기가 뚝 끊기면 순서를 바꾸거나 마스터링 음량을 맞춰 보세요. 실제 곡 사이 간격은 플랫폼·재생 설정에 따라 달라요.`),
    h('ul', { class: 'transition-list' }, pairs.map((p) => {
      const key = `${p.from}>${p.to}`;
      const jump = p.gap != null && Math.abs(p.gap) > ALBUM_LOUDNESS_GAP;
      return h('li', { class: 'row' },
        h('span', { class: 'tag mono' }, `${p.i + 1}→${p.i + 2}`),
        h('span', { class: 'transition-names' }, `${title(p.from)} → ${title(p.to)}`),
        p.gap != null ? h('span', { class: `mono small${jump ? ' over' : ' muted'}` }, `음량 ${p.gap > 0 ? '+' : ''}${p.gap.toFixed(1)} LU`) : null,
        h('span', { class: 'push' }),
        p.ready
          ? h('button', { type: 'button', class: `btn small${ui.playing === key ? ' primary' : ''}`, id: `tr-${p.i}`, disabled: !!ui.loading, onclick: () => play(album, p) },
            ui.loading === key ? '준비 중…' : ui.playing === key ? '■ 정지' : '▶ 이어 듣기')
          : h('span', { class: 'muted small' }, '마스터를 넣으면 들을 수 있어요'));
    })));
}
