// 사운드 탭: 악기별 음색·밝기·볼륨·음소거. 재생 중에도 볼륨은 바로 바뀐다.
import { h } from '../dom.js';
import { mutate } from '../state.js';
import { INSTRUMENTS } from '../music/instruments.js';
import { audition, liveVolume } from '../music/player.js';
import { playBar } from './playbar.js';

export function renderSound(song) {
  const sounds = song.music.sounds;
  const used = new Set(Object.values(song.music.sections).flatMap((sm) => sm.instruments));
  const hasMelody = Object.values(song.music.sections).some((sm) => sm.melody.length);
  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, '사운드 (악기 음색)'),
      h('p', { class: 'muted' }, '들으면서 고르세요. "미리듣기"로 악기 하나만 들어 볼 수 있어요. 어떤 섹션에 어떤 악기가 나올지는 편곡 탭에서 정해요.'),
      playBar(song),
      h('p', { class: 'muted small' }, '사운드 출처: Salamander Grand Piano, FluidR3 GM (CC BY 3.0), smpldsnds drum-machines (퍼블릭 도메인). 808 베이스·플럭·아르페지오·신스 리드는 앱 신스. 샘플을 못 불러오면 신스로 대신 소리 나요.')),
    h('div', { class: 'sections' }, INSTRUMENTS.map((inst) => {
      const s = sounds[inst.id];
      const inUse = inst.id === 'lead' ? hasMelody : used.has(inst.id);
      const set = (fn, scope = 'all') => mutate((x) => fn(x.music.sounds[inst.id]), scope);
      return h('article', { class: `section mixer-row${inUse ? '' : ' unused'}` },
        h('div', { class: 'mixer-name' },
          h('strong', null, inst.name),
          h('span', { class: 'muted' }, inUse ? '곡에서 쓰는 중' : '아직 안 씀')),
        h('select', { id: `var-${inst.id}`, 'aria-label': `${inst.name} 음색`, onchange: (e) => set((x) => { x.variant = e.target.value; }) },
          Object.entries(inst.variants).map(([k, v]) => h('option', { value: k, selected: s.variant === k }, v))),
        h('label', { class: 'slider' }, h('span', { class: 'muted' }, '어둡게'),
          h('input', { type: 'range', id: `tone-${inst.id}`, min: '0', max: '1', step: '0.05', value: String(s.tone), 'aria-label': `${inst.name} 밝기`,
            oninput: (e) => set((x) => { x.tone = Number(e.target.value); }, 'quiet') }),
          h('span', { class: 'muted' }, '밝게')),
        h('label', { class: 'slider' }, h('span', { class: 'muted' }, '볼륨'),
          h('input', { type: 'range', id: `vol-${inst.id}`, min: '0', max: '1', step: '0.05', value: String(s.vol), 'aria-label': `${inst.name} 볼륨`,
            oninput: (e) => { const v = Number(e.target.value); set((x) => { x.vol = v; }, 'quiet'); liveVolume(inst.id, v, s.mute); } })),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: `chip${s.mute ? ' on' : ''}`, 'aria-pressed': s.mute ? 'true' : 'false',
            onclick: () => { const mute = !s.mute; set((x) => { x.mute = mute; }); liveVolume(inst.id, s.vol, mute); } }, s.mute ? '음소거됨' : '음소거'),
          h('button', { type: 'button', class: 'btn small', onclick: () => audition(song, inst.id) }, '미리듣기')));
    })),
  );
}
