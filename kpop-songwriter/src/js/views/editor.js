// 구조·가사 탭: 섹션 편집, 파트 분배, AI 작사, 라임·음절 표시, 훅 추천, AI 검토.
import { h, uid, afterBlur } from '../dom.js';
import { mutate, mutateSong } from '../state.js';
import { SECTION_TYPES, TEMPLATES } from '../constants.js';
import { sectionLabels, makeSection, sectionsFromTemplate, autoDistribute, lineShare } from '../structure.js';
import { analyzeSection, languageRatio } from '../lyrictools.js';
import { writeLyrics, suggestHooks, reviewLyrics } from '../ai.js';
import { job, isBusy, runJob, stopJob } from '../aijob.js';
import { feedbackBar, trackEdit, lineLikes } from '../learn/feedback.js';
import { scoreSong, scoreSection } from '../optimize/lyricscore.js';
import { improveLyrics, DEFAULT_THRESHOLD } from '../optimize/improve.js';

// AI가 마지막으로 쓴 섹션 가사 (취향 학습용, 저장하지 않음): sectionId → { text, gen }
const aiOrigin = {};

// 곡별 화면 메모 (저장하지 않음)
const memo = {};
function memoOf(id) {
  if (!memo[id]) memo[id] = { request: '', hooks: [], review: '', confirmTemplate: '', report: null, confirmDel: '' };
  return memo[id];
}

export function renderEditor(song) {
  const m = memoOf(song.id);
  const labels = sectionLabels(song.sections);
  const scores = scoreSong(song);
  const byId = Object.fromEntries(scores.sections.map((s) => [s.id, s.result]));
  return h('div', { class: 'stack' },
    renderToolbar(song, m),
    renderScore(song, m, scores),
    renderShare(song),
    h('div', { class: 'sections' }, song.sections.map((s, i) => renderSection(song, s, i, labels[i], byId[s.id]))),
    h('button', { type: 'button', class: 'btn wide', onclick: () => mutate((x) => { x.sections.push(makeSection('Verse')); }) }, '+ 섹션 추가'),
    renderHooks(song, m),
    renderReview(song, m),
  );
}

function renderToolbar(song, m) {
  const busy = isBusy();
  const tplSelect = h('select', { id: 'tpl', 'aria-label': '구조 템플릿' },
    Object.entries(TEMPLATES).map(([k, t]) => h('option', { value: k, selected: m.confirmTemplate === k }, t.name)));
  const applyTemplate = () => {
    const key = tplSelect.value;
    mutate((s) => { s.sections = autoDistribute(sectionsFromTemplate(key), s.members); });
    m.confirmTemplate = '';
  };
  // 가사뿐 아니라 멜로디·편곡 작업이 있어도 지워지므로 확인한다
  const hasLyrics = song.sections.some((s) => s.text.trim()) || Object.values(song.music.sections).some((sm) => sm.melody.length) || !!song.progress?.arranged;
  const tplRow = m.confirmTemplate
    ? h('div', { class: 'confirm' },
      h('span', null, '지금 가사·멜로디·편곡이 모두 새 구조로 바뀌어요. 먼저 버전 탭에서 저장해 두는 걸 권해요.'),
      h('button', { type: 'button', class: 'btn danger', onclick: applyTemplate }, '지우고 적용'),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { m.confirmTemplate = ''; mutate(() => {}, 'all'); } }, '취소'))
    : h('div', { class: 'row' }, tplSelect,
      h('button', { type: 'button', class: 'btn', onclick: () => {
        if (hasLyrics) { m.confirmTemplate = tplSelect.value; mutate(() => {}, 'all'); } else applyTemplate();
      } }, '템플릿 적용'),
      h('button', { type: 'button', class: 'btn', disabled: !song.members.length, onclick: () => mutate((s) => { s.sections = autoDistribute(s.sections, s.members); }) }, '파트 자동 분배'));

  const request = h('textarea', {
    id: 'ai-request', rows: '2', value: m.request,
    placeholder: '추가 요청 (선택) 예: 코러스에 "signal" 반복, 랩은 더 공격적으로',
    oninput: (e) => { m.request = e.target.value; },
  });
  const ko = languageRatio(song.sections.map((s) => s.text).join('\n'));
  return h('section', { class: 'card' },
    h('h2', null, '구조와 AI 작사'),
    tplRow,
    request,
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn primary', disabled: busy, onclick: () => runJob('전체 가사 쓰는 중', async (signal, progress) => {
        const empty = song.sections.filter((x) => !x.text.trim() && x.type !== 'Dance Break').map((x) => x.id);
        if (!empty.length) throw { code: 'nothing_empty' };
        const out = await writeLyrics(song, { targetIds: empty, request: m.request, signal, onProgress: (n) => progress(`${n}자 받는 중`) });
        applyLyrics(song.id, out);
      }) }, '빈 섹션 전부 AI로 쓰기'),
      busy ? h('button', { type: 'button', class: 'btn ghost', onclick: stopJob }, '중지') : null,
      busy ? h('span', { class: 'status' }, h('span', { class: 'dot' }), job.label, ' ', h('span', { id: 'job-progress', class: 'mono' }, job.progress || '생각하는 중…')) : null,
      ko != null ? h('span', { class: 'muted mono push' }, `현재 한국어 ${ko}% · 목표 ${song.concept.koRatio}%`) : null),
    h('p', { class: 'muted' }, '전체 쓰기는 가사가 빈 섹션만 채워요. 이미 쓴 섹션을 바꾸려면 섹션의 "AI로 다시 쓰기"를 누르세요. Claude 호출은 내 claude.ai 사용량을 써요.'),
  );
}

function scoreClass(n) {
  return n >= 80 ? 'good' : n >= DEFAULT_THRESHOLD ? '' : 'warn-pill';
}

function renderScore(song, m, scores) {
  const busy = isBusy();
  const low = scores.sections.filter((s) => s.result && s.result.score < DEFAULT_THRESHOLD);
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, '가사 점수'),
      h('span', { class: `pill ${scoreClass(scores.score)}` }, `${scores.score}점`)),
    h('p', { class: 'muted' }, '라임(줄 끝 모음), 줄 길이와 균형, 코러스 훅 반복, 분량으로 매긴 참고 점수예요. AI 없이 계산해요.'),
    scores.tips.length ? h('ul', { class: 'warn-list' }, scores.tips.map((t) => h('li', null, t))) : null,
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn', disabled: busy || !low.length, onclick: () => runJob('자동 개선 중', async (signal, progress) => {
        const res = await improveLyrics(song, { signal, onStep: progress });
        m.report = res.report;
        if (Object.keys(res.updates).length) {
          mutateSong(song.id, (x) => {
            Object.entries(res.updates).forEach(([id, text]) => {
              const sec = x.sections.find((y) => y.id === id);
              if (sec) { sec.text = text; aiOrigin[id] = { text, gen: uid() }; }
            });
          });
        }
      }) }, low.length ? `${DEFAULT_THRESHOLD}점 미만 ${low.length}개 섹션 자동 개선` : `모든 섹션 ${DEFAULT_THRESHOLD}점 이상`),
      h('span', { class: 'muted small' }, 'AI가 고칠 점을 받아 다시 쓰고, 점수가 오른 것만 반영해요 (최대 2회).')),
    m.report ? h('ul', { class: 'report' }, m.report.length
      ? m.report.map((r) => h('li', null, `${r.round}회차 [${r.label}] ${r.before} → ${r.after}점 · ${r.kept ? '반영' : '그대로 둠'}`))
      : h('li', null, '고칠 섹션이 없었어요.')) : null,
  );
}

// AI 결과는 요청한 곡에 넣는다 (그 사이 다른 곡을 열었어도)
function applyLyrics(songId, out) {
  if (!out.length) throw { code: 'invalid_json' };
  mutateSong(songId, (s) => {
    out.forEach(({ id, text }) => {
      const sec = s.sections.find((x) => x.id === id);
      if (sec) {
        sec.text = text;
        aiOrigin[id] = { text, gen: uid() };
      }
    });
  });
}

function renderShare(song) {
  if (!song.members.length) return null;
  const share = lineShare(song.sections, song.members);
  const max = Math.max(1, ...Object.values(share));
  return h('section', { class: 'card' },
    h('h2', null, '파트 분배 (줄 수)'),
    h('div', { class: 'share' }, song.members.map((mem) => h('div', { class: 'share-row' },
      h('span', { class: 'share-name' }, mem.name || '이름 없음'),
      h('span', { class: 'share-bar' }, h('span', { style: `width:${(share[mem.id] / max) * 100}%` })),
      h('span', { class: 'mono share-num' }, share[mem.id].toFixed(1))))),
  );
}

function renderSection(song, s, index, label, result) {
  const busy = isBusy();
  const analysis = analyzeSection(s.text);
  const gutter = h('div', { class: 'gutter', 'aria-hidden': 'true' });
  const fillGutter = (rows) => {
    gutter.replaceChildren(...rows.map((r) => h('div', { class: 'g-line' },
      h('span', { class: 'syl' }, r.syllables || ''),
      r.key ? h('span', { class: `rk${r.group >= 0 ? ` r${r.group}` : ''}` }, r.key) : null)));
  };
  fillGutter(analysis);
  const ta = h('textarea', {
    id: `lyr-${s.id}`, class: 'lyrics', wrap: 'off', spellcheck: 'false',
    rows: String(Math.max(3, analysis.length + 1)),
    'aria-label': `${label} 가사`,
    placeholder: s.type === 'Dance Break' ? '비워 두면 [Instrumental]로 내보내요' : '한 줄에 한 소절씩. (괄호)는 애드립',
    value: s.text,
    oninput: (e) => {
      const rows = analyzeSection(e.target.value);
      e.target.rows = Math.max(3, rows.length + 1);
      fillGutter(rows);
      mutate((x) => { x.sections.find((y) => y.id === s.id).text = e.target.value; }, 'quiet');
      const pill = document.getElementById(`score-${s.id}`);
      const live = pill && scoreSection({ ...s, text: e.target.value });
      if (live) { pill.textContent = `${live.score}점`; pill.className = `pill ${scoreClass(live.score)}`; pill.title = live.tips.join(' '); }
      const origin = aiOrigin[s.id];
      if (origin) trackEdit({ kind: 'lyrics', ref: origin.gen, before: origin.text, after: e.target.value, context: { section: s.type, song: song.title } });
    },
    onscroll: (e) => { gutter.scrollTop = e.target.scrollTop; },
    // 칸을 벗어나면 곡 점수·자동 개선 버튼·파트 분배를 새 가사로 다시 그린다
    onchange: afterBlur(() => mutate(() => {})),
  });

  const memberChips = song.members.length ? h('div', { class: 'chips small' }, song.members.map((mem) => {
    const on = s.members.includes(mem.id);
    return h('button', {
      type: 'button', class: `chip${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false',
      onclick: () => mutate((x) => {
        const sec = x.sections.find((y) => y.id === s.id);
        sec.members = on ? sec.members.filter((id) => id !== mem.id) : [...sec.members, mem.id];
      }),
    }, mem.name || '?');
  })) : null;

  const move = (d) => mutate((x) => {
    const j = index + d;
    if (j < 0 || j >= x.sections.length) return;
    [x.sections[index], x.sections[j]] = [x.sections[j], x.sections[index]];
  });

  return h('article', { class: `section t-${s.type.replace(/\s/g, '').toLowerCase()}` },
    h('header', { class: 'section-head' },
      h('span', { class: 'tag mono' }, `[${label}]`),
      h('select', { id: `type-${s.id}`, 'aria-label': '섹션 종류', onchange: (e) => mutate((x) => { x.sections.find((y) => y.id === s.id).type = e.target.value; }) },
        SECTION_TYPES.map((t) => h('option', { value: t, selected: t === s.type }, t))),
      result ? h('span', { class: `pill ${scoreClass(result.score)}`, id: `score-${s.id}`, title: result.tips.join(' ') }, `${result.score}점`) : null,
      h('span', { class: 'push' }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': '위로', disabled: index === 0, onclick: () => move(-1) }, '↑'),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': '아래로', disabled: index === song.sections.length - 1, onclick: () => move(1) }, '↓'),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': '복제', onclick: () => mutate((x) => {
        x.sections.splice(index + 1, 0, { ...makeSection(s.type, s.text), members: [...s.members] });
      }) }, '⧉'),
      memoOf(song.id).confirmDel === s.id
        ? h('span', { class: 'row' },
          h('button', { type: 'button', class: 'btn small danger', onclick: () => { memoOf(song.id).confirmDel = ''; mutate((x) => { x.sections.splice(index, 1); }); } }, '가사·멜로디·편곡까지 삭제'),
          h('button', { type: 'button', class: 'btn small ghost', onclick: () => { memoOf(song.id).confirmDel = ''; mutate(() => {}); } }, '취소'))
        : h('button', { type: 'button', class: 'icon-btn', 'aria-label': '섹션 삭제', onclick: () => {
          const hasWork = s.text.trim() || song.music.sections[s.id]?.melody.length;
          if (hasWork) { memoOf(song.id).confirmDel = s.id; mutate(() => {}); } else mutate((x) => { x.sections.splice(index, 1); });
        } }, '×')),
    memberChips,
    h('div', { class: 'lyric-box' }, ta, gutter),
    result && result.tips.length && result.score < 90 ? h('ul', { class: 'tips' }, result.tips.map((t) => h('li', null, t))) : null,
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn small', disabled: busy, onclick: () => runJob(`${label} 쓰는 중`, async (signal, progress) => {
        const out = await writeLyrics(song, { targetIds: [s.id], request: memoOf(song.id).request, signal, onProgress: (n) => progress(`${n}자`) });
        applyLyrics(song.id, out);
      }) }, s.text.trim() ? 'AI로 다시 쓰기' : 'AI로 쓰기')),
    aiOrigin[s.id] ? feedbackBar({ kind: 'lyrics', ref: aiOrigin[s.id].gen, text: aiOrigin[s.id].text, context: { section: s.type, song: song.title }, label: 'AI가 쓴 가사예요. 고치면 고친 방향도 배워요' }) : null,
    aiOrigin[s.id] ? lineLikes({ kind: 'lyrics', ref: aiOrigin[s.id].gen, text: s.text, context: { section: s.type, song: song.title } }) : null,
  );
}

function renderHooks(song, m) {
  const busy = isBusy();
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, '영어 훅 추천'),
      h('button', { type: 'button', class: 'btn', disabled: busy, onclick: () => runJob('훅 찾는 중', async (signal) => {
        m.hooks = await suggestHooks(song, { signal });
      }) }, m.hooks.length ? '다시 추천' : '훅 6개 추천받기')),
    m.hooks.length
      ? h('ul', { class: 'hooks' }, m.hooks.map((x) => h('li', null,
        h('strong', null, String(x.hook)),
        h('span', { class: 'muted' }, ` ${x.meaning || ''}`),
        h('p', null, String(x.use || '')),
        feedbackBar({ kind: 'hook', ref: `hook:${song.id}:${x.hook}`, text: `${x.hook} (${x.meaning || ''})`, label: '' }))))
      : h('p', { class: 'empty' }, '컨셉과 키워드를 보고 코러스에 쓸 영어 훅을 추천해요.'),
  );
}

function renderReview(song, m) {
  const busy = isBusy();
  const out = h('pre', { class: 'review', id: 'review-out' }, m.review || '');
  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, 'AI 가사 검토'),
      h('button', { type: 'button', class: 'btn', disabled: busy, onclick: () => runJob('가사 검토 중', async (signal) => {
        m.review = '';
        const res = await reviewLyrics(song, {
          signal,
          onText: ({ text }) => { m.review = text; const el = document.getElementById('review-out'); if (el) el.textContent = text; },
        });
        m.review = res.text;
      }) }, '검토받기')),
    m.review || job.label === '가사 검토 중' ? out : h('p', { class: 'empty' }, '훅, 파트 균형, 어색한 줄, 컨셉 일치를 짚어 줘요.'),
  );
}
