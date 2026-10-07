// 앨범 > 일정 (발매일 기준 체크리스트, 캘린더 파일) / 홍보 (AI 문구 초안).
import { h, field, copyText, toast } from '../../dom.js';
import { mutateAlbum, mutateAlbumById, getState } from '../../state.js';
import { scheduleFor } from '../../album/model.js';
import { writePromo, PITCH_LIMIT } from '../../album/release.js';
import { isBusy, runJob, stopJob, job } from '../../aijob.js';
import { scheduleIcs } from '../../album/ics.js';
import { zip } from '../../music/pack.js';
import { saveFile, isArtifact } from '../../platform/download.js';

async function downloadIcs(album) {
  const text = scheduleIcs(album);
  if (!text) { toast('남은 일정이 없어요'); return; }
  const name = `${(album.title || 'album').replace(/[\\/:*?"<>|]+/g, '').trim() || 'album'} 발매 일정`;
  // 아티팩트 다운로드는 허용 확장자만 받으므로 zip으로 감싼다
  const res = isArtifact()
    ? await saveFile(`${name}.zip`, zip([{ name: `${name}.ics`, data: text }]))
    : await saveFile(`${name}.ics`, new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  if (res === 'saved') toast('받았어요. 파일을 열어 캘린더에 추가하세요');
  else if (res === 'unavailable') toast('이 화면에서는 파일을 받을 수 없어요');
}

export function renderSchedule(album) {
  const items = scheduleFor(album);
  const next = items.find((s) => !s.done);
  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, '발매 일정'),
        h('input', { id: 'sched-date', type: 'date', value: album.releaseDate, 'aria-label': '발매 예정일', onchange: (e) => mutateAlbum((a) => { a.releaseDate = e.target.value; }) })),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn small', id: 'sched-ics', disabled: !album.releaseDate, onclick: () => downloadIcs(album) }, '캘린더에 넣기 (.ics)'),
        h('span', { class: 'muted small' }, album.releaseDate ? '받은 파일을 열면 폰·PC 캘린더에 남은 일정이 들어가고, 그날 아침 9시에 알려 줘요.' : '발매 예정일을 정하면 캘린더 파일을 받을 수 있어요.')),
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
  // limit이 있으면 글자 수를 보여 주고 넘으면 빨갛게 (입력할 때마다 숫자만 바꿈)
  const copyable = (id, label, value, rows, onInput, limit = 0) => {
    const count = limit ? h('span', { class: 'mono muted small', id: `${id}-count` }) : null;
    const show = (v) => { if (count) { count.textContent = `${v.length} / ${limit}자`; count.classList.toggle('over', v.length > limit); } };
    const ta = h('textarea', { id, rows: String(rows), value, oninput: (e) => { onInput(e.target.value); show(e.target.value); } });
    show(value || '');
    return h('div', { class: 'field' },
      h('div', { class: 'card-head' }, h('span', { class: 'field-label' }, label),
        h('span', { class: 'row' }, count, h('button', { type: 'button', class: 'btn small ghost', onclick: () => copyText(ta.value, ta) }, '복사'))),
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
            mutateAlbumById(album.id, (a) => { a.promo = { ...a.promo, ...res, tracks: { ...a.promo.tracks, ...res.tracks } }; });
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
    h('section', { class: 'card' },
      h('h2', null, '플레이리스트 피칭 (Spotify for Artists)'),
      h('p', { class: 'muted small' }, `발매 최소 7일 전(일정의 D-14 단계 권장)에 미발매 타이틀곡 한 곡을 에디터에게 소개하는 글이에요. ${PITCH_LIMIT}자까지 들어가요.`),
      copyable('promo-pitch', '영어', p.pitch || '', 5, (v) => mutateAlbum((a) => { a.promo.pitch = v; }, 'quiet'), PITCH_LIMIT),
      copyable('promo-pitch-ko', '한국어', p.pitchKo || '', 5, (v) => mutateAlbum((a) => { a.promo.pitchKo = v; }, 'quiet'), PITCH_LIMIT)),
  );
}
