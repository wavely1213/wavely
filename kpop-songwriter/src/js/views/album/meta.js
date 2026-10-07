// 앨범 > 정보·크레딧: 유통사에 넣을 메타데이터와 트랙별 크레딧.
import { h, field, afterBlur } from '../../dom.js';
import { mutateAlbum, getState, refresh } from '../../state.js';
import { help } from '../../help.js';
import { splitsFor } from '../../album/splits.js';
import { fillCredits } from '../../album/model.js';

const LANGUAGES = ['한국어', '영어', '한국어·영어', '일본어', '연주곡(가사 없음)'];
const GENRES = ['K-Pop', 'Pop', 'Dance', 'R&B/Soul', 'Hip-Hop/Rap', 'Ballad', 'Electronic', 'Rock', 'Indie'];

// 여러 명이 한 역할(작사·작곡·편곡)은 지분 %를 적는다. 안 적으면 똑같이 나눈 것으로 본다.
function renderSplits(t, i) {
  const roles = splitsFor(t).filter((r) => r.people.length > 1);
  if (!roles.length) return null;
  // 칸을 벗어난 뒤 다시 그린다 (afterBlur는 이벤트를 넘기지 않으므로 값을 먼저 읽어 둠)
  const setShare = (r, name) => (e) => {
    const v = Math.max(0, Math.min(100, Number(e.target.value) || 0));
    afterBlur(() => mutateAlbum((a) => {
      const cur = Object.fromEntries(r.people.map((p) => [p.name, p.share]));
      cur[name] = v;
      a.tracks[i].splits = { ...(a.tracks[i].splits || {}), [r.key]: cur };
    }))();
  };
  return h('div', { class: 'splits' },
    h('span', { class: 'field-label' }, '지분 (역할마다 합 100%) ', help('split')),
    roles.map((r) => h('div', { class: 'split-row' },
      h('strong', null, r.name),
      r.people.map((p, k) => h('label', { class: 'split-person' }, p.name,
        h('input', { id: `split-${t.songId}-${r.key}-${k}`, type: 'number', min: '0', max: '100', step: '0.01', value: String(p.share), onchange: setShare(r, p.name) }), '%')),
      h('span', { class: `mono small${Math.abs(r.sum - 100) > 0.01 ? ' over' : ' muted'}` }, `합 ${r.sum}%`),
      r.custom ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => mutateAlbum((a) => { const sp = { ...(a.tracks[i].splits || {}) }; delete sp[r.key]; a.tracks[i].splits = sp; }) }, '똑같이 나누기')
        : h('span', { class: 'muted small' }, '똑같이 나눔'))));
}

export function renderMeta(album) {
  const { songs } = getState();
  const quiet = (fn) => (e) => mutateAlbum((a) => fn(a, e.target.value), 'quiet');
  // 입력 중엔 저장만, 칸을 벗어나면 화면 갱신 (다른 칸·버튼이 이 값에 따라 바뀜)
  const input = (id, label, key, placeholder, hint) => field(label, h('input', { id, value: album[key], placeholder, oninput: quiet((a, v) => { a[key] = v; }), onchange: afterBlur(() => mutateAlbum(() => {})) }), hint);

  const trackRows = album.tracks.map((t, i) => {
    const song = songs.find((s) => s.id === t.songId);
    if (!song) return null;
    const rerender = afterBlur(refresh); // 이름이 바뀌면 지분 칸이 생기거나 사라짐 (저장은 입력 때 이미 함, 빈 되돌리기 단계를 만들지 않게)
    const set = (k) => (e) => mutateAlbum((a) => { a.tracks[i][k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; }, e.target.type === 'checkbox' ? 'all' : 'quiet');
    return h('article', { class: 'section' },
      h('header', { class: 'section-head' }, h('span', { class: 'tag mono' }, String(i + 1).padStart(2, '0')), h('strong', null, song.title)),
      h('div', { class: 'grid2' },
        field('작사', h('input', { id: `lyr-${t.songId}`, value: t.lyricists, placeholder: '실명 또는 활동명, 여러 명은 쉼표', oninput: set('lyricists'), onchange: rerender })),
        field('작곡', h('input', { id: `com-${t.songId}`, value: t.composers, placeholder: '쉼표로 구분', oninput: set('composers'), onchange: rerender })),
        field('편곡', h('input', { id: `arr-${t.songId}`, value: t.arrangers, placeholder: '쉼표로 구분', oninput: set('arrangers'), onchange: rerender })),
        field('피처링 (선택)', h('input', { id: `feat-${t.songId}`, value: t.featuring, oninput: set('featuring') })),
        field(['ISRC (유통사 발급 후) ', help('isrc')], h('input', { id: `isrc-${t.songId}`, class: 'mono', value: t.isrc, placeholder: 'KRA0X2600001', oninput: set('isrc') }))),
      h('div', { class: 'row' }, h('label', { class: 'check' }, h('input', { type: 'checkbox', id: `exp-${t.songId}`, checked: t.explicit, onchange: set('explicit') }), '19금(Explicit) 가사'), help('explicit')),
      renderSplits(t, i));
  });

  return h('div', { class: 'stack' },
    h('section', { class: 'card' },
      h('h2', null, '앨범 정보'),
      h('div', { class: 'grid2' },
        field('앨범 제목', h('input', { id: 'album-title', value: album.title, oninput: quiet((a, v) => { a.title = v; }), onchange: afterBlur(() => mutateAlbum(() => {})) })),
        input('album-artist', '아티스트명', 'artist', '플랫폼에 표시될 이름'),
        field('발매 예정일', h('input', { id: 'album-date', type: 'date', value: album.releaseDate, onchange: (e) => mutateAlbum((a) => { a.releaseDate = e.target.value; }) })),
        field('장르', h('select', { id: 'album-genre', onchange: (e) => mutateAlbum((a) => { a.genre = e.target.value; }) },
          GENRES.map((g) => h('option', { value: g, selected: album.genre === g }, g)))),
        input('album-subgenre', '세부 장르', 'subgenre', 'Dance, Synth-pop'),
        field('언어', h('select', { id: 'album-lang', onchange: (e) => mutateAlbum((a) => { a.language = e.target.value; }) },
          LANGUAGES.map((l) => h('option', { value: l, selected: album.language === l }, l)))),
        input('album-label', '레이블 (선택)', 'label', '없으면 비워 두기'),
        input('album-upc', ['UPC (유통사 발급 후) ', help('upc')], 'upc', ''),
        input('album-cline', ['© 표기 (작품 저작권자) ', help('cline')], 'cLine', '2026 물결뮤직'),
        input('album-pline', ['℗ 표기 (음원 제작자) ', help('pline')], 'pLine', '2026 물결뮤직')),
      field('앨범 소개 메모', h('textarea', { id: 'album-desc', rows: '3', value: album.description, placeholder: '앨범의 이야기, 컨셉. 홍보 문구를 만들 때 참고해요.', oninput: quiet((a, v) => { a.description = v; }) })),
      h('div', { class: 'field' },
        h('span', { class: 'field-label' }, 'AI 사용 표기 (유통사·플랫폼 정책 확인용)'),
        h('div', { class: 'row' },
          [['lyrics', '가사'], ['composition', '작곡·편곡'], ['vocals', '보컬(Suno 등)']].map(([k, label]) => h('label', { class: 'check' },
            h('input', { type: 'checkbox', id: `ai-${k}`, checked: album.ai[k], onchange: (e) => mutateAlbum((a) => { a.ai[k] = e.target.checked; }) }), label))),
        h('input', { id: 'ai-note', 'aria-label': 'AI 사용 메모', value: album.ai.note, placeholder: '메모 (예: 가사는 직접 수정, 보컬은 Suno 생성)', oninput: quiet((a, v) => { a.ai.note = v; }) }))),
    h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, '트랙별 크레딧'),
        album.artist.trim() ? h('button', { type: 'button', class: 'btn small', id: 'fill-credits', onclick: () => mutateAlbum((a) => { fillCredits(a, songs, a.artist); }) }, `빈 크레딧을 "${album.artist}"로 채우기`) : null),
      h('p', { class: 'muted' }, '저작권 신고와 정산 기준이 되니 실제로 작업한 사람을 적어 주세요.')),
    album.tracks.length ? h('div', { class: 'sections' }, trackRows) : h('p', { class: 'empty card' }, '수록곡을 먼저 넣어 주세요.'),
  );
}
