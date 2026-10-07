// 컨셉 탭: 제목, 주제, 분위기, 한/영 비율, 멤버.
import { h, field, uid, afterBlur } from '../dom.js';
import { mutate } from '../state.js';
import { GROUP_TYPES, MOODS, POSITIONS } from '../constants.js';
import { VOICE_RANGES, defaultVoice, midiName } from '../music/range.js';

export function renderConcept(song) {
  const c = song.concept;
  const quiet = (fn) => (e) => mutate((s) => fn(s, e.target.value), 'quiet');

  const moods = h('div', { class: 'chips' }, MOODS.map((m) => h('button', {
    type: 'button',
    class: `chip${c.moods.includes(m) ? ' on' : ''}`,
    'aria-pressed': c.moods.includes(m) ? 'true' : 'false',
    onclick: () => mutate((s) => {
      s.concept.moods = s.concept.moods.includes(m) ? s.concept.moods.filter((x) => x !== m) : [...s.concept.moods, m];
    }),
  }, m)));

  const ratioOut = h('output', { class: 'mono' }, `한국어 ${c.koRatio}% · 영어 ${100 - c.koRatio}%`);
  const ratio = h('input', {
    id: 'ko-ratio', type: 'range', min: '30', max: '100', step: '5', value: String(c.koRatio),
    oninput: (e) => {
      const v = Number(e.target.value);
      ratioOut.textContent = `한국어 ${v}% · 영어 ${100 - v}%`;
      mutate((s) => { s.concept.koRatio = v; }, 'quiet');
    },
  });

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, '곡 컨셉'),
      h('div', { class: 'grid2' },
        field('곡 제목', h('input', { id: 'title', value: song.title, oninput: quiet((s, v) => { s.title = v; }), onchange: afterBlur(() => mutate(() => {})) })),
        field('그룹 형태', h('select', { id: 'group', onchange: (e) => mutate((s) => { s.concept.group = e.target.value; }) },
          Object.entries(GROUP_TYPES).map(([k, v]) => h('option', { value: k, selected: c.group === k }, v)))),
      ),
      field('주제 한 줄', h('input', { id: 'theme', value: c.theme, placeholder: '예: 연락이 끊긴 사람에게 새벽마다 보내는 신호', oninput: quiet((s, v) => { s.concept.theme = v; }) })),
      field('스토리·화자 상황', h('textarea', { id: 'story', rows: '3', value: c.story, placeholder: '누가, 언제, 어떤 감정으로 부르는 노래인지', oninput: quiet((s, v) => { s.concept.story = v; }) })),
      field('키워드', h('input', { id: 'keywords', value: c.keywords, placeholder: '쉼표로 구분: 새벽 3시, 신호, 창문 불빛', oninput: quiet((s, v) => { s.concept.keywords = v; }) })),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '분위기'), moods),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '가사 언어 비율'), ratio, ratioOut),
    ),
    renderMembers(song),
  );
}

function renderMembers(song) {
  const rows = song.members.map((m) => h('div', { class: 'member-row' },
    h('input', { id: `m-name-${m.id}`, 'aria-label': '이름', value: m.name, placeholder: '이름', oninput: (e) => mutate((s) => { s.members.find((x) => x.id === m.id).name = e.target.value; }, 'quiet') }),
    h('select', { id: `m-pos-${m.id}`, 'aria-label': '포지션', onchange: (e) => mutate((s) => { s.members.find((x) => x.id === m.id).position = e.target.value; }) },
      POSITIONS.map((p) => h('option', { value: p, selected: m.position === p }, p))),
    h('select', { id: `m-voice-${m.id}`, 'aria-label': '음역', onchange: (e) => mutate((s) => { s.members.find((x) => x.id === m.id).voice = e.target.value; }) },
      Object.entries(VOICE_RANGES).map(([k, v]) => h('option', { value: k, selected: (m.voice || defaultVoice(song.concept.group, m.position)) === k },
        v.low == null ? v.name : `${v.name} ${midiName(v.low)}~${midiName(v.high)}`))),
    h('input', { id: `m-tone-${m.id}`, 'aria-label': '보컬 톤 (영어, Suno 태그에 쓰임)', value: m.tone, placeholder: '보컬 톤 (영어) 예: husky low female vocal', oninput: (e) => mutate((s) => { s.members.find((x) => x.id === m.id).tone = e.target.value; }, 'quiet') }),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': `${m.name || '멤버'} 삭제`, onclick: () => mutate((s) => {
      s.members = s.members.filter((x) => x.id !== m.id);
      s.sections.forEach((sec) => { sec.members = sec.members.filter((id) => id !== m.id); });
    }) }, '×'),
  ));
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, `멤버 ${song.members.length}명`),
      h('button', { type: 'button', class: 'btn', onclick: () => mutate((s) => {
        s.members.push({ id: uid(), name: `멤버${s.members.length + 1}`, position: '서브보컬', tone: '' });
      }) }, '+ 멤버 추가')),
    h('p', { class: 'muted' }, '음역은 멜로디가 부를 수 있는 높이인지 확인하는 데 써요. 보컬 톤은 영어로 적어 두면 Suno 섹션 태그로 쓰여요. 솔로곡이면 1명만 두세요.'),
    rows.length ? h('div', { class: 'member-list' }, rows) : h('p', { class: 'empty' }, '아직 멤버가 없어요. 멤버를 추가하면 구조 탭에서 파트를 나눌 수 있어요.'),
  );
}
