// 레퍼런스 탭: 참고 곡 오디오 분석(브라우저 안에서만) + 좋았던 점 메모. AI 편곡이 이걸 참고한다.
import { h, uid, toast } from '../dom.js';
import { mutate, mutateSong, refresh } from '../state.js';
import { analyzeAudio, describeAnalysis } from '../music/analyze.js';
import { keyName } from '../music/theory.js';

const LIKES = ['드럼 그루브', '베이스 라인', '코드 분위기', '보컬 톤', '곡 구성', '드롭·빌드업', '사운드 질감', '멜로디 흐름', '랩 플로우'];
const ui = { analyzing: '', textName: '' };

export function renderReferences(song) {
  const file = h('input', { type: 'file', id: 'ref-file', accept: 'audio/*', class: 'visually-hidden', onchange: (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) addAudio(song.id, f);
  } });
  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, '레퍼런스 곡'),
      h('p', { class: 'muted' }, '좋아하는 곡을 넣으면 빠르기·키·저음·에너지 흐름을 분석해요. 오디오 파일은 이 브라우저 안에서만 읽고 어디에도 올리거나 저장하지 않아요. 분석한 숫자와 메모만 남아요.'),
      h('div', { class: 'row' },
        file,
        h('label', { for: 'ref-file', class: `btn primary${ui.analyzing ? ' disabled' : ''}` }, '오디오 파일로 추가 (mp3·wav·m4a)'),
        ui.analyzing ? h('span', { class: 'status' }, h('span', { class: 'dot' }), ui.analyzing) : null),
      h('div', { class: 'row' },
        h('input', { id: 'ref-name', value: ui.textName, placeholder: '파일 없이 곡 이름만 적어 추가 (예: 좋아하는 곡 제목)', oninput: (e) => { ui.textName = e.target.value; } }),
        h('button', { type: 'button', class: 'btn', onclick: () => {
          const name = ui.textName.trim();
          if (!name) { toast('곡 이름을 적어 주세요'); return; }
          ui.textName = '';
          mutate((s) => { s.references.unshift(newRef(name, null)); });
        } }, '이름으로 추가'))),
    song.references.length
      ? h('div', { class: 'sections' }, song.references.map((r) => renderRef(song, r)))
      : h('p', { class: 'empty card' }, '아직 레퍼런스가 없어요. 비슷하게 만들고 싶은 곡을 하나 넣어 보세요. 멜로디나 가사를 베끼지는 않고, 분위기와 사운드 방향만 참고해요.'),
  );
}

function newRef(name, analysis) {
  return { id: uid(), name, analysis, likes: [], note: '', use: true };
}

async function addAudio(songId, f) {
  ui.analyzing = '분석 준비 중';
  refresh();
  try {
    const analysis = await analyzeAudio(f, (step) => {
      ui.analyzing = step;
      const el = document.querySelector('.status');
      if (el) el.lastChild.textContent = step;
    });
    mutateSong(songId, (s) => { s.references.unshift(newRef(f.name.replace(/\.[^.]+$/, ''), analysis)); });
    toast('분석했어요');
  } catch {
    toast('이 파일은 읽지 못했어요. mp3나 wav로 다시 시도해 주세요');
  } finally {
    ui.analyzing = '';
    refresh();
  }
}

function sparkline(curve, drops) {
  if (!curve?.length) return null;
  const w = 600;
  const hgt = 60;
  const step = w / Math.max(1, curve.length - 1);
  const pts = curve.map((v, i) => `${(i * step).toFixed(1)},${(hgt - v * (hgt - 4) - 2).toFixed(1)}`).join(' ');
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  svg.setAttribute('class', 'spark');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '시간에 따른 에너지 흐름');
  const area = document.createElementNS(ns, 'polygon');
  area.setAttribute('points', `0,${hgt} ${pts} ${w},${hgt}`);
  area.setAttribute('class', 'spark-area');
  const line = document.createElementNS(ns, 'polyline');
  line.setAttribute('points', pts);
  line.setAttribute('class', 'spark-line');
  svg.append(area, line);
  drops.forEach((d) => {
    const x = document.createElementNS(ns, 'line');
    x.setAttribute('x1', d * step); x.setAttribute('x2', d * step); x.setAttribute('y1', 0); x.setAttribute('y2', hgt);
    x.setAttribute('class', 'spark-drop');
    svg.append(x);
  });
  return svg;
}

function renderRef(song, r) {
  const set = (fn, scope = 'all') => mutate((s) => { const x = s.references.find((y) => y.id === r.id); if (x) fn(x); }, scope);
  const a = r.analysis;
  const d = a ? describeAnalysis(a) : null;
  return h('article', { class: 'section' },
    h('header', { class: 'section-head' },
      h('input', { id: `ref-n-${r.id}`, class: 'ref-name', value: r.name, 'aria-label': '레퍼런스 이름', oninput: (e) => set((x) => { x.name = e.target.value; }, 'quiet') }),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', id: `ref-use-${r.id}`, checked: r.use, onchange: (e) => set((x) => { x.use = e.target.checked; }) }), '이 곡에 반영'),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': '레퍼런스 삭제', onclick: () => mutate((s) => { s.references = s.references.filter((y) => y.id !== r.id); }) }, '×')),
    a ? h('div', { class: 'stack-tight' },
      h('dl', { class: 'facts' },
        h('dt', null, '빠르기'), h('dd', { class: 'mono' }, `${a.bpm} BPM`),
        h('dt', null, '키'), h('dd', null, d.key),
        h('dt', null, '저음'), h('dd', null, d.bass),
        h('dt', null, '소리'), h('dd', null, d.bright),
        h('dt', null, '터지는 지점'), h('dd', { class: 'mono' }, d.drops),
        h('dt', null, '길이'), h('dd', { class: 'mono' }, d.length)),
      sparkline(a.energy, a.drops),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn small', onclick: () => mutate((s) => { s.music.bpm = a.bpm; }) }, `내 곡 빠르기를 ${a.bpm}로`),
        h('button', { type: 'button', class: 'btn small', onclick: () => mutate((s) => { s.music.root = a.root; s.music.mode = a.mode; }) }, `내 곡 키를 ${keyName(a.root, a.mode)}로`)))
      : h('p', { class: 'muted' }, '이름만 있는 레퍼런스예요. 좋았던 점을 자세히 적을수록 AI가 잘 참고해요.'),
    h('div', { class: 'field' }, h('span', { class: 'field-label' }, '이 곡에서 가져오고 싶은 것'),
      h('div', { class: 'chips small' }, LIKES.map((l) => {
        const on = r.likes.includes(l);
        return h('button', { type: 'button', class: `chip${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false',
          onclick: () => set((x) => { x.likes = on ? x.likes.filter((y) => y !== l) : [...x.likes, l]; }) }, l);
      }))),
    h('textarea', { id: `ref-note-${r.id}`, rows: '2', value: r.note, placeholder: '구체적으로 적어 주세요. 예: 코러스 전에 소리가 다 빠졌다가 터지는 부분, 통통 튀는 베이스', oninput: (e) => set((x) => { x.note = e.target.value; }, 'quiet') }),
  );
}
