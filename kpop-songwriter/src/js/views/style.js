// 스타일 탭: Suno 스타일 프롬프트 재료 입력 + AI 제안.
import { h, field } from '../dom.js';
import { mutate } from '../state.js';
import { GENRES, SUNO_LIMITS } from '../constants.js';
import { buildStyle } from '../suno.js';
import { suggestStyle } from '../ai.js';
import { isBusy, runJob, stopJob, job } from '../aijob.js';

const why = {};

export function renderStyle(song) {
  const st = song.style;
  const preview = h('p', { class: 'style-preview mono', id: 'style-preview' }, buildStyle(st) || '아직 비어 있어요');
  const count = h('span', { class: 'mono muted', id: 'style-count' });
  const updatePreview = () => {
    const text = buildStyle(song.style);
    preview.textContent = text || '아직 비어 있어요';
    count.textContent = `${text.length} / ${SUNO_LIMITS.style}자`;
    count.classList.toggle('over', text.length > SUNO_LIMITS.style);
  };
  updatePreview();

  const input = (key, label, placeholder, attrs = {}) => field(label, h('input', {
    id: `style-${key}`, value: st[key] ?? '', placeholder, ...attrs,
    oninput: (e) => {
      mutate((s) => { s.style[key] = attrs.type === 'number' ? Number(e.target.value) || '' : e.target.value; }, 'quiet');
      updatePreview();
    },
  }));

  const genreList = h('datalist', { id: 'genre-list' }, GENRES.map((g) => h('option', { value: g })));
  const busy = isBusy();

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, 'Suno 스타일 프롬프트'),
        h('div', { class: 'row' },
          busy ? h('button', { type: 'button', class: 'btn ghost', onclick: stopJob }, '중지') : null,
          h('button', { type: 'button', class: 'btn primary', disabled: busy, onclick: () => runJob('스타일 제안 중', async (signal) => {
            const res = await suggestStyle(song, { signal });
            mutate((s) => {
              ['genre', 'subgenre', 'key', 'vocals', 'instruments', 'production', 'extra', 'exclude'].forEach((k) => {
                if (typeof res[k] === 'string' && res[k].trim()) s.style[k] = res[k].trim();
              });
              const bpm = Number(res.bpm);
              if (bpm >= 50 && bpm <= 220) s.style.bpm = Math.round(bpm);
            });
            why[song.id] = String(res.why || '');
          }) }, busy && job.label === '스타일 제안 중' ? '제안받는 중…' : '컨셉으로 AI 제안'))),
      why[song.id] ? h('p', { class: 'note' }, why[song.id]) : null,
      h('p', { class: 'muted' }, '영어로 적어요. 실존 가수·곡 이름은 Suno가 막기 때문에 넣지 마세요.'),
      genreList,
      h('div', { class: 'grid2' },
        input('genre', '장르', 'K-pop dance pop', { list: 'genre-list' }),
        input('subgenre', '서브 장르·결', 'dreamy synth-pop'),
        input('bpm', 'BPM', '120', { type: 'number', min: '50', max: '220' }),
        input('key', '키 (선택)', 'F# minor'),
      ),
      input('vocals', '보컬', 'airy female group vocals, crisp female rap'),
      input('instruments', '악기', 'synth pads, punchy 808, crisp claps'),
      input('production', '사운드·편곡', 'wide stereo, beat drop into chorus'),
      input('extra', '기타 분위기', 'night city atmosphere'),
      input('exclude', '제외할 스타일 (Suno의 Exclude styles 칸)', 'heavy metal'),
    ),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', null, '미리보기'), count),
      preview),
  );
}
