// 재생 버튼·진행 막대 (편곡·멜로디·사운드 탭 공통). 위치 표시는 app.js가 갱신한다.
import { h } from '../dom.js';
import { play, stop, isPlaying, isLoading } from '../music/player.js';
import { refresh } from '../state.js';
import { songSeconds } from '../music/arrangement.js';

// keys: 단축키 표시 (전체 듣기는 스페이스바, app.js)
export function playButton(song, { onlyIds, label, text = '▶ 듣기', cls = 'btn', keys = null } = {}) {
  return h('button', {
    type: 'button', class: cls, 'aria-keyshortcuts': keys, title: keys === 'Space' ? '스페이스바로도 듣기·정지' : null,
    onclick: async () => {
      if (isPlaying() || isLoading()) { stop(); refresh(); return; }
      const p = play(song, { onlyIds, label });
      refresh();
      await p;
      refresh();
    },
  }, isPlaying() ? '■ 정지' : isLoading() ? '악기 불러오는 중…' : text);
}

export function playBar(song) {
  const sec = Math.round(songSeconds(song));
  return h('div', { class: 'playbar' },
    playButton(song, { label: '전체', text: '▶ 전체 듣기', cls: 'btn primary', keys: 'Space' }),
    h('div', { class: 'progress', 'aria-hidden': 'true' }, h('span', { id: 'play-progress' })),
    h('span', { class: 'mono muted', id: 'play-label' }, `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`));
}
