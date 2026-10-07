// 앨범 > 성과: 발매 후 날짜마다 트랙별 누적 재생 수 기록, 곡별 비교·그래프, 반응 좋은 곡을 취향에 반영.
import { h, toast } from '../../dom.js';
import { getState, mutateAlbum, mutateTaste, refresh } from '../../state.js';
import { addSnapshot, trackSummary, standout, learnFromRelease } from '../../album/stats.js';
import { isoDate } from '../../album/model.js';

const ui = { date: '', values: {} };

// 날짜별 누적 재생 수 작은 그래프 (점이 하나면 그리지 않음)
function spark(series) {
  if (series.length < 2) return null;
  const max = Math.max(...series.map((p) => p.plays), 1);
  const pts = series.map((p, i) => `${(i / (series.length - 1)) * 100},${30 - (p.plays / max) * 28}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 30');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'spark stat-spark');
  svg.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  line.setAttribute('points', pts);
  line.setAttribute('class', 'spark-line');
  svg.append(line);
  return svg;
}

const fmtN = (n) => (n == null ? '—' : n.toLocaleString('ko-KR'));

export function renderStats(album) {
  const { songs, taste } = getState();
  const rows = trackSummary(album, songs);
  const best = standout(rows);
  const learned = best && taste.log.some((e) => e.context?.ref === `release:${album.id}:${best.songId}`);
  if (!ui.date) ui.date = isoDate(new Date());
  const save = () => {
    if (!addSnapshot({ stats: [] }, ui.date, ui.values)) { toast('날짜와 재생 수를 하나 이상 적어 주세요'); return; }
    mutateAlbum((a) => { addSnapshot(a, ui.date, ui.values); });
    ui.values = {};
    toast('기록했어요');
  };
  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, '발매 후 성과 기록'),
      h('p', { class: 'muted' }, '유통사·플랫폼 통계에서 곡마다 지금까지의 재생 수(여러 플랫폼을 합친 누적)를 적어 두세요. 일주일에 한 번이면 충분해요. 반응이 좋은 곡을 찾아 다음 곡에 반영해요.'),
      album.tracks.length ? h('div', { class: 'stat-form' },
        h('label', { class: 'field' }, h('span', { class: 'field-label' }, '날짜'),
          h('input', { type: 'date', id: 'stat-date', value: ui.date, onchange: (e) => { ui.date = e.target.value; } })),
        rows.map((r) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, `${r.title} 누적 재생`),
          h('input', { type: 'number', min: '0', id: `stat-${r.songId}`, value: ui.values[r.songId] ?? '', placeholder: r.latest != null ? `지난 기록 ${fmtN(r.latest)}` : '예: 1200', oninput: (e) => { ui.values[r.songId] = e.target.value; } }))),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn primary', id: 'stat-save', onclick: save }, '기록하기')))
        : h('p', { class: 'empty' }, '수록곡을 먼저 넣어 주세요.')),
    (album.stats || []).length ? h('section', { class: 'card' },
      h('div', { class: 'card-head' }, h('h2', null, '곡별 반응'), h('span', { class: 'muted small' }, `기록 ${album.stats.length}번 · 마지막 ${album.stats[album.stats.length - 1].date}`)),
      h('table', { class: 'compare stat-table' },
        h('thead', null, h('tr', null, h('th', null, '곡'), h('th', null, '누적'), h('th', null, '지난 기록보다'), h('th', null, '비중'), h('th', null, ''))),
        h('tbody', null, rows.map((r) => h('tr', { class: best?.songId === r.songId ? 'stat-best' : '' },
          h('th', null, r.title, r.isTitle ? h('span', { class: 'muted small' }, ' (타이틀)') : null),
          h('td', { class: 'mono' }, fmtN(r.latest)),
          h('td', { class: 'mono' }, r.growth == null ? '—' : `+${fmtN(r.growth)}`),
          h('td', { class: 'mono' }, r.share == null ? '—' : `${r.share}%`),
          h('td', null, spark(r.series)))))),
      best ? h('div', { class: 'note' },
        h('p', null, `「${best.title}」의 반응이 가장 좋아요 (전체의 ${best.share}%).${best.isTitle ? '' : ' 타이틀곡이 아닌데 반응이 좋다면 다음 활동곡 후보예요.'}`),
        learned ? h('p', { class: 'muted small', id: 'stat-learned' }, '이 곡의 편곡·코러스를 취향 기록에 넣었어요. 다음 AI 작사·편곡에 반영돼요.')
          : h('button', { type: 'button', class: 'btn small', id: 'stat-learn', onclick: () => {
            const song = songs.find((s) => s.id === best.songId);
            if (!song) return;
            mutateTaste((t) => learnFromRelease(t, album, song));
            toast('취향 기록에 넣었어요');
            refresh();
          } }, '이 곡의 특징을 다음 곡에 반영 (취향 기록에 넣기)'))
        : rows.filter((r) => r.latest != null).length > 1 ? h('p', { class: 'muted small' }, '곡마다 반응이 비슷해요. 기록이 더 쌓이면 다시 볼게요.') : null)
      : null,
  );
}
