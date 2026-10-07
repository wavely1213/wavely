// 앨범 > 수록곡: 곡 사이 넘어가는 부분 듣기. 앞 곡 끝 6초 → 다음 곡 처음 6초를 이어 들어 흐름·음량 차이를 확인한다.
import { h, toast } from '../../dom.js';
import { refresh, getState } from '../../state.js';
import { mastersOf } from '../../album/session.js';
import { EDGE_SECS, edgesOf, joinClips, transitionPairs } from '../../album/transition.js';
import { ALBUM_LOUDNESS_GAP } from '../../album/model.js';

const RATE = 44100;
const edgeCache = new WeakMap(); // 마스터 정보 객체 → { head, tail } (마스터를 바꾸면 새 객체라 다시 잰다)
// token: 누를 때마다·멈출 때마다 늘린다. 파일을 푸는 사이 멈췄거나 다른 곳으로 갔으면 소리를 내지 않는다.
const ui = { ctx: null, src: null, playing: '', loading: '', albumId: '', token: 0 };

export function stopTransition() {
  ui.token++;
  try { ui.src?.stop(); } catch { /* 이미 멈춤 */ }
  ui.src = null;
  ui.playing = '';
  ui.loading = '';
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
  const token = ui.token;
  // 소리 켜기는 누른 그 순간에 (파일을 푼 뒤에 하면 브라우저가 막을 수 있음). 기다리지는 않는다.
  if (!ui.ctx) ui.ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ui.ctx.state === 'suspended') ui.ctx.resume().catch(() => {});
  const m = mastersOf(album.id);
  ui.loading = key;
  ui.albumId = album.id;
  refresh();
  try {
    const [a, b] = await Promise.all([edges(m[pair.from]), edges(m[pair.to])]);
    const st = getState();
    if (token !== ui.token || !(st.mode === 'album' && st.albumId === album.id && st.albumTab === 'tracks')) return;
    const clip = joinClips(a.tail, b.head, RATE);
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
    if (token === ui.token) toast('마스터 파일을 읽지 못했어요. 다시 넣어 주세요');
  } finally {
    if (token === ui.token) { ui.loading = ''; refresh(); }
  }
}

export function renderTransitions(album, songs) {
  const pairs = transitionPairs(album.tracks, mastersOf(album.id));
  // 다른 앨범으로 갔거나 순서가 바뀌어 듣던 쌍이 없어졌으면 멈춘다 (멈출 버튼이 사라지므로)
  const live = ui.playing || ui.loading;
  if (live && (ui.albumId !== album.id || !pairs.some((p) => `${p.from}>${p.to}` === live))) stopTransition();
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
