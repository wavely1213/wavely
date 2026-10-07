// 앨범 > 수록곡: 곡 넣기·순서·타이틀곡, 트랙별 마스터 WAV 넣기와 규격 점검.
import { h, toast } from '../../dom.js';
import { mutateAlbum, refresh, selectSong, setTab, getState, keepSong, addInstVersion, newSongInAlbum } from '../../state.js';
import { newTrack, ALBUM_TYPES } from '../../album/model.js';
import { inspectMaster } from '../../album/release.js';
import { mastersOf, setMaster, fillFromSongMasters } from '../../album/session.js';
import { keyName } from '../../music/theory.js';
import { suggestOrder } from '../../album/order.js';

const busy = {};

async function attach(album, songId, file) {
  busy[songId] = true;
  refresh();
  try {
    setMaster(album.id, songId, await inspectMaster(file));
  } catch {
    toast('이 파일은 읽지 못했어요. WAV 파일을 넣어 주세요');
  } finally {
    busy[songId] = false;
    refresh();
  }
}

function masterChip(m) {
  if (!m) return h('span', { class: 'pill warn-pill' }, '마스터 없음');
  const ok = /\.wav$/i.test(m.name) && (m.sampleRate || 0) >= 44100 && (!m.bits || m.bits >= 16) && m.format !== 3 && m.channels !== 1
    && Number.isFinite(m.lufs) && m.peak <= -0.5;
  const from = m.fromTab ? '마스터링 탭 결과 · ' : '';
  const fmt = `${m.sampleRate ? `${(m.sampleRate / 1000).toFixed(1)}kHz` : '?kHz'}${m.bits ? ` ${m.bits}bit${m.format === 3 ? ' float' : ''}` : ''} · ${Number.isFinite(m.lufs) ? m.lufs.toFixed(1) : '—'} LUFS · ${m.peak.toFixed(1)} dBTP`;
  return h('span', { class: `pill ${ok ? 'good' : 'warn-pill'}`, title: m.name }, `${ok ? '규격 OK' : '확인 필요'} · ${from}${fmt}`);
}

export function renderTracks(album) {
  const { songs } = getState();
  fillFromSongMasters(album);
  const masters = mastersOf(album.id);
  const inAlbum = new Set(album.tracks.map((t) => t.songId));
  const available = songs.filter((s) => !inAlbum.has(s.id));
  const type = ALBUM_TYPES[album.type];
  const addSel = h('select', { id: 'album-add-song', 'aria-label': '넣을 곡' },
    available.map((s) => h('option', { value: s.id }, s.title)));

  const rows = album.tracks.map((t, i) => {
    const song = songs.find((s) => s.id === t.songId);
    if (!song) {
      return h('article', { class: 'section' }, h('div', { class: 'row' },
        h('span', { class: 'muted' }, `${i + 1}. 지워진 곡`),
        h('button', { type: 'button', class: 'btn small ghost push', onclick: () => mutateAlbum((a) => { a.tracks.splice(i, 1); }) }, '빼기')));
    }
    const filled = song.sections.filter((s) => s.text.trim()).length;
    const file = h('input', { type: 'file', id: `master-${t.songId}`, accept: '.wav,audio/wav,audio/*', class: 'visually-hidden', onchange: (e) => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (f) attach(album, t.songId, f);
    } });
    const move = (d) => mutateAlbum((a) => {
      const j = i + d;
      if (j < 0 || j >= a.tracks.length) return;
      [a.tracks[i], a.tracks[j]] = [a.tracks[j], a.tracks[i]];
    });
    return h('article', { class: 'section', id: `track-${t.songId}`, tabindex: '-1' },
      h('header', { class: 'section-head' },
        h('span', { class: 'tag mono' }, String(i + 1).padStart(2, '0')),
        h('strong', { class: 'track-title' }, song.title),
        t.isTitle ? h('span', { class: 'pill good' }, '타이틀') : null,
        h('span', { class: 'push' }),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': '위로', disabled: i === 0, onclick: () => move(-1) }, '↑'),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': '아래로', disabled: i === album.tracks.length - 1, onclick: () => move(1) }, '↓'),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': '앨범에서 빼기', onclick: () => mutateAlbum((a) => { a.tracks.splice(i, 1); }) }, '×')),
      h('p', { class: 'muted' }, `${keyName(song.music.root, song.music.mode)} · ${song.music.bpm} BPM · 가사 ${filled}/${song.sections.length} 섹션`),
      h('div', { class: 'row' },
        h('label', { class: 'check' }, h('input', { type: 'radio', name: 'title-track', id: `title-${t.songId}`, checked: t.isTitle,
          onchange: () => mutateAlbum((a) => { a.tracks.forEach((x) => { x.isTitle = x.songId === t.songId; }); }) }), '타이틀곡'),
        masterChip(masters[t.songId]),
        busy[t.songId] ? h('span', { class: 'status' }, h('span', { class: 'dot' }), '점검 중') : null,
        h('span', { class: 'push' }),
        file,
        h('label', { for: `master-${t.songId}`, class: 'btn small' }, masters[t.songId] ? '마스터 바꾸기' : '마스터 WAV 넣기'),
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => { selectSong(song.id); setTab('master'); } }, '마스터링 하러 가기'),
        !song.instOf && !songs.some((x) => x.instOf === song.id && album.tracks.some((y) => y.songId === x.id))
          ? h('button', { type: 'button', class: 'btn small ghost', id: `inst-${t.songId}`, title: '가사 없는 연주곡 트랙을 바로 뒤에 더해요. Suno에서 Instrumental로 만든 결과를 마스터로 넣으세요.', onclick: () => {
            const inst = addInstVersion(album.id, song.id);
            if (!inst) return;
            toast('Inst. 트랙을 더했어요. Suno에서 연주곡으로 만든 파일을 마스터로 넣어 주세요');
            document.getElementById(`track-${inst.id}`)?.focus({ preventScroll: true }); // 누른 버튼이 사라지므로 새 트랙으로
          } }, 'Inst. 버전 추가') : null),
    );
  });

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, `수록곡 ${album.tracks.length}곡`),
        h('select', { id: 'album-type', 'aria-label': '앨범 종류', onchange: (e) => mutateAlbum((a) => { a.type = e.target.value; }) },
          Object.entries(ALBUM_TYPES).map(([k, v]) => h('option', { value: k, selected: album.type === k }, `${v.name} (${v.min}~${v.max}곡)`)))),
      h('div', { class: 'row' },
        available.length ? [addSel, h('button', { type: 'button', class: 'btn', onclick: () => {
          const id = addSel.value;
          if (!id) return;
          keepSong(id);
          mutateAlbum((a) => {
            a.tracks.push(newTrack(id));
            if (a.tracks.length === 1) a.tracks[0].isTitle = true;
          });
        } }, '+ 곡 넣기')] : h('span', { class: 'muted' }, '넣을 곡이 없어요.'),
        h('button', { type: 'button', class: 'btn', id: 'album-new-song', title: '타이틀곡의 그룹·멤버를 이어받은 새 곡을 만들어 이 앨범에 넣어요', onclick: () => {
          const song = newSongInAlbum(album.id);
          toast(song?.members.length ? `타이틀곡의 멤버 ${song.members.length}명을 이어받아 새 곡을 만들고 앨범에 넣었어요` : '새 곡을 만들고 앨범에 넣었어요');
        } }, '+ 이 앨범의 새 곡')),
      h('p', { class: 'muted' }, `마스터 WAV는 곡의 마스터링 탭에서 받은 파일을 넣으세요. 파일은 이 브라우저에 보관했다가 제출 패키지에 넣어요 (다른 기기에서는 다시 넣어야 해요). ${type.name}은 보통 ${type.min}~${type.max}곡이에요.`)),
    album.tracks.length > 1 ? renderOrder(album, songs) : null,
    album.tracks.length ? h('div', { class: 'sections' }, rows) : h('p', { class: 'empty card' }, '아직 수록곡이 없어요. 위에서 곡을 넣어 주세요.'),
  );
}

// 트랙 순서 추천: 지금보다 나은 순서가 있으면 보여 주고, 누르면 그 순서로 (되돌리기 가능)
function renderOrder(album, songs) {
  const r = suggestOrder(album.tracks, songs);
  const title = (id) => (songs.find((s) => s.id === id)?.title || '').replace(/^예시:\s*/, '');
  if (!r.better) return h('p', { class: 'muted small', id: 'order-ok' }, `트랙 순서가 자연스러워요${r.why.length ? ` (${r.why.join(', ')})` : ''}.`);
  return h('section', { class: 'card', id: 'order-suggest' },
    h('div', { class: 'card-head' },
      h('h2', null, '이 순서는 어때요?'),
      h('button', { type: 'button', class: 'btn small primary', onclick: () => mutateAlbum((a) => {
        a.tracks = r.order.map((id) => a.tracks.find((t) => t.songId === id)).filter(Boolean).concat(a.tracks.filter((t) => !r.order.includes(t.songId)));
      }) }, '이 순서로 바꾸기')),
    h('ol', { class: 'order-list' }, r.order.map((id) => h('li', null, title(id)))),
    h('p', { class: 'muted small' }, `${r.why.join(', ')}. BPM·에너지(편곡 탭)·키로 계산한 제안이에요. 바꾼 뒤에도 ↶로 되돌릴 수 있어요.`));
}
