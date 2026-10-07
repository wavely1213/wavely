// 앨범 > 일정 (발매일 기준 체크리스트) / 홍보 (AI 문구 초안).
import { h, field, copyText } from '../../dom.js';
import { mutateAlbum, getState } from '../../state.js';
import { scheduleFor } from '../../album/model.js';
import { writePromo } from '../../album/release.js';
import { isBusy, runJob, stopJob, job } from '../../aijob.js';

export function renderSchedule(album) {
  const items = scheduleFor(album);
  const next = items.find((s) => !s.done);
  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, '발매 일정'),
        h('input', { id: 'sched-date', type: 'date', value: album.releaseDate, 'aria-label': '발매 예정일', onchange: (e) => mutateAlbum((a) => { a.releaseDate = e.target.value; }) })),
      next ? h('p', { class: 'note' }, `다음 할 일: ${next.date} ${next.title}${next.left != null ? ` (${next.left > 0 ? `${next.left}일 남음` : next.left === 0 ? '오늘' : `${-next.left}일 지남`})` : ''}`) : h('p', { class: 'note' }, '모든 단계를 끝냈어요.')),
    h('ol', { class: 'versions schedule' }, items.map((s) => h('li', { class: `version${s.overdue ? ' overdue' : ''}${s.done ? ' done' : ''}` },
      h('label', { class: 'version-head' },
        h('input', { type: 'checkbox', id: `sch-${s.id}`, checked: s.done, onchange: (e) => mutateAlbum((a) => { a.schedule[s.id] = e.target.checked; }) }),
        h('span', { class: 'mono muted' }, `${s.date} · D${s.offset >= 0 ? '+' : ''}${s.offset}`),
        h('strong', null, s.title),
        s.overdue ? h('span', { class: 'pill warn-pill' }, '지남') : null),
      h('p', { class: 'muted' }, s.detail)))),
  );
}

export function renderPromo(album) {
  const { songs } = getState();
  const busy = isBusy();
  const p = album.promo;
  const copyable = (id, label, value, rows, onInput) => {
    const ta = h('textarea', { id, rows: String(rows), value, oninput: (e) => onInput(e.target.value) });
    return h('div', { class: 'field' },
      h('div', { class: 'card-head' }, h('span', { class: 'field-label' }, label),
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => copyText(ta.value, ta) }, '복사')),
      ta);
  };
  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, '홍보 문구'),
        h('div', { class: 'row' },
          busy ? h('button', { type: 'button', class: 'btn ghost', onclick: stopJob }, '중지') : null,
          busy ? h('span', { class: 'status' }, h('span', { class: 'dot' }), job.label) : null,
          h('button', { type: 'button', class: 'btn primary', disabled: busy || !album.tracks.length, onclick: () => runJob('홍보 문구 쓰는 중', async (signal) => {
            const res = await writePromo(album, songs, { signal });
            mutateAlbum((a) => { a.promo = { ...a.promo, ...res, tracks: { ...a.promo.tracks, ...res.tracks } }; });
          }) }, p.intro ? 'AI로 다시 쓰기' : 'AI로 초안 쓰기'))),
      h('p', { class: 'muted' }, '정보 탭의 앨범 소개 메모와 각 곡의 컨셉·가사를 참고해요. 초안을 고쳐 쓰면 그대로 저장돼요.')),
    h('section', { class: 'card' },
      copyable('promo-intro', '앨범 소개', p.intro, 5, (v) => mutateAlbum((a) => { a.promo.intro = v; }, 'quiet')),
      ...album.tracks.map((t, i) => {
        const s = songs.find((x) => x.id === t.songId);
        if (!s) return null;
        return field(`${i + 1}. ${s.title}`, h('textarea', { id: `promo-t-${t.songId}`, rows: '2', value: p.tracks[t.songId] || '', oninput: (e) => mutateAlbum((a) => { a.promo.tracks[t.songId] = e.target.value; }, 'quiet') }));
      }),
      ...[0, 1, 2].map((k) => copyable(`promo-sns-${k}`, ['SNS · 발매 공지', 'SNS · 티저', 'SNS · 하이라이트'][k], p.sns[k] || '', 3,
        (v) => mutateAlbum((a) => { const sns = [...a.promo.sns]; sns[k] = v; a.promo.sns = sns; }, 'quiet'))),
      copyable('promo-tags', '해시태그', p.hashtags, 2, (v) => mutateAlbum((a) => { a.promo.hashtags = v; }, 'quiet'))),
  );
}
