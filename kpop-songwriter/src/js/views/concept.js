// 컨셉 탭: 제목, 주제, 분위기, 한/영 비율, 멤버.
import { h, field, uid, afterBlur, toast } from '../dom.js';
import { mutate, setTab, getState } from '../state.js';
import { makeDraft } from '../workflow/draft.js';
import { suggestConcepts } from '../ai-concept.js';
import { isBusy, runJob, stopJob, job } from '../aijob.js';
import { GROUP_TYPES, MOODS, POSITIONS } from '../constants.js';
import { VOICE_RANGES, defaultVoice, midiName } from '../music/range.js';
import { memberSources, importMembers } from '../members.js';

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
    id: 'ko-ratio', 'aria-label': '가사 한국어 비율', type: 'range', min: '30', max: '100', step: '5', value: String(c.koRatio),
    oninput: (e) => {
      const v = Number(e.target.value);
      ratioOut.textContent = `한국어 ${v}% · 영어 ${100 - v}%`;
      mutate((s) => { s.concept.koRatio = v; }, 'quiet');
    },
  });

  const ready = !!(c.theme.trim() || c.story.trim() || c.keywords.trim());
  const busy = isBusy();
  return h('div', { class: 'stack' },
    h('section', { class: 'card draft-card' },
      h('div', { class: 'card-head' },
        h('h2', null, 'AI로 곡 초안 한 번에'),
        h('div', { class: 'row' },
          busy ? h('button', { type: 'button', class: 'btn ghost', onclick: stopJob }, '중지') : null,
          busy ? h('span', { class: 'status' }, h('span', { class: 'dot' }), h('span', { id: 'job-progress' }, job.progress || job.label)) : null,
          h('button', { type: 'button', class: 'btn primary', disabled: busy || !ready, onclick: () => runJob('초안 만드는 중', async (signal, progress) => {
            const done = await makeDraft(song.id, { signal, onStep: progress });
            if (done.length) { toast(`초안 완성: ${done.join(', ')}`); setTab('editor'); }
          }) }, '초안 만들기'))),
      h('p', { class: 'muted' }, ready
        ? '아래 컨셉으로 빈 섹션 가사 → 편곡 → 멜로디 → Suno 스타일을 차례로 채워요. 이미 쓴 가사는 그대로 둬요. 몇 분 걸리고, 중간에 멈춰도 거기까지는 남아요.'
        : '먼저 아래에 주제·스토리·키워드 중 하나를 적어 주세요. 그걸로 가사부터 멜로디까지 초안을 만들어요.')),
    renderIdeas(song, busy),
    h('section', { class: 'card' },
      h('h2', null, '곡 컨셉'),
      h('div', { class: 'grid2' },
        field('곡 제목', h('input', { id: 'title', value: song.title, oninput: quiet((s, v) => { s.title = v; }), onchange: afterBlur(() => mutate(() => {})) })),
        field('그룹 형태', h('select', { id: 'group', onchange: (e) => mutate((s) => { s.concept.group = e.target.value; }) },
          Object.entries(GROUP_TYPES).map(([k, v]) => h('option', { value: k, selected: c.group === k }, v)))),
      ),
      field('주제 한 줄', h('input', { id: 'theme', value: c.theme, placeholder: '예: 연락이 끊긴 사람에게 새벽마다 보내는 신호', oninput: quiet((s, v) => { s.concept.theme = v; }), onchange: afterBlur(() => mutate(() => {})) })),
      field('스토리·화자 상황', h('textarea', { id: 'story', rows: '3', value: c.story, placeholder: '누가, 언제, 어떤 감정으로 부르는 노래인지', oninput: quiet((s, v) => { s.concept.story = v; }), onchange: afterBlur(() => mutate(() => {})) })),
      field('키워드', h('input', { id: 'keywords', value: c.keywords, placeholder: '쉼표로 구분: 새벽 3시, 신호, 창문 불빛', oninput: quiet((s, v) => { s.concept.keywords = v; }), onchange: afterBlur(() => mutate(() => {})) })),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '분위기'), moods),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, '가사 언어 비율'), ratio, ratioOut),
    ),
    renderMembers(song),
    h('section', { class: 'card' },
      h('h2', null, '작업 메모'),
      h('textarea', { id: 'song-memo', rows: '4', 'aria-label': '작업 메모', value: song.memo || '', placeholder: '나만 보는 메모예요. 예: Suno 3번째 생성 링크, 브릿지 다시 쓰기, 하린 파트 늘리기', oninput: quiet((s, v) => { s.memo = v; }) }),
      h('p', { class: 'muted small' }, 'AI 요청·제작 패키지·유통사 제출 패키지에는 들어가지 않아요. 버전·전체 백업에는 함께 저장돼요.')),
  );
}

// 컨셉 아이디어 카드 3개 (곡마다, 저장하지 않음). 고르면 컨셉 칸을 채운다 (되돌리기 가능).
const ideas = {};
function renderIdeas(song, busy) {
  const m = ideas[song.id] || (ideas[song.id] = { hint: '', list: [] });
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, '아이디어가 없다면'),
      h('button', { type: 'button', class: 'btn', id: 'ideas-run', disabled: busy, onclick: () => runJob('컨셉 아이디어 찾는 중', async (signal) => {
        m.list = await suggestConcepts(song, { hint: m.hint, signal });
      }) }, m.list.length ? '다른 아이디어' : '컨셉 아이디어 3개 받기')),
    h('input', { id: 'ideas-hint', 'aria-label': '컨셉 아이디어 방향 (선택)', value: m.hint, placeholder: '원하는 방향이 있으면 (선택) 예: 여름, 이별 뒤 홀가분함, 걸크러시', oninput: (e) => { m.hint = e.target.value; } }),
    m.list.length ? h('div', { class: 'ideas' }, m.list.map((c, i) => h('article', { class: 'idea' },
      h('strong', null, c.title),
      h('p', null, c.theme),
      h('p', { class: 'muted small' }, c.story),
      h('p', { class: 'small' }, [c.moods.join(' · '), c.keywords, c.hook && `훅: ${c.hook}`].filter(Boolean).join(' / ')),
      h('button', { type: 'button', class: 'btn small primary', id: `idea-use-${i}`, onclick: () => {
        mutate((s) => {
          s.title = c.title;
          Object.assign(s.concept, { theme: c.theme, story: c.story, keywords: [c.keywords, c.hook].filter(Boolean).join(', ') });
          if (c.moods.length) s.concept.moods = c.moods;
        });
        toast('컨셉을 채웠어요. 위의 "초안 만들기"로 가사부터 멜로디까지 이어서 만들 수 있어요');
      } }, '이 컨셉으로'))))
      : h('p', { class: 'muted small' }, '취향 기록과 지금 적어 둔 것을 바탕으로 서로 다른 방향 3개를 제안해요.'));
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
    rows.length ? null : renderMemberImport(song),
  );
}

// 멤버가 없을 때만: 다른 곡의 멤버 구성 불러오기 (같은 그룹으로 여러 곡)
function renderMemberImport(song) {
  const { songs } = getState();
  const list = memberSources(songs, song);
  if (!list.length) return null;
  const sel = h('select', { id: 'member-import', 'aria-label': '멤버를 불러올 곡' }, list.map((x) => h('option', { value: x.id }, x.label)));
  return h('div', { class: 'row' },
    sel,
    h('button', { type: 'button', class: 'btn', id: 'member-import-run', onclick: () => {
      const from = songs.find((x) => x.id === sel.value);
      if (!from) return;
      mutate((s) => importMembers(s, from));
      toast(`멤버 ${from.members.length}명을 불러왔어요`);
    } }, '이 곡의 멤버 불러오기'));
}
