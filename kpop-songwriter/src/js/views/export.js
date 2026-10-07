// 내보내기 탭: Suno Custom 모드 칸별 복사 + 제작 패키지(zip) 받기 + 다른 언어 버전.
import { h, copyText, toast } from '../dom.js';
import { refresh, mutateSong, getState } from '../state.js';
import { applyToStyle } from './arrange.js';
import { keyName } from '../music/theory.js';

import { buildLyrics, buildStyle } from '../suno.js';
import { SUNO_LIMITS } from '../constants.js';
import { buildPackage } from '../package.js';
import { saveFile } from '../platform/download.js';
import { renderTranslate } from './translate.js';

// 가사·스타일을 복사하거나 패키지를 받으면 진행 상황의 'Suno 생성' 단계 완료로 친다
const markSuno = (songId) => mutateSong(songId, (x) => { x.progress = { ...(x.progress || {}), suno: true }; }, 'quiet');

const opts = { memberTags: true, arrangeHints: false, keepAdlibs: true };
const pkg = { includeWav: true, busy: '' };

async function downloadPackage(song) {
  pkg.busy = '준비 중';
  refresh();
  try {
    const { blob, filename } = await buildPackage(song, {
      includeWav: pkg.includeWav,
      lyricOpts: opts,
      onStep: (t) => { pkg.busy = t; const el = document.getElementById('pkg-status'); if (el) el.textContent = t; },
    });
    pkg.busy = '저장 확인 창을 확인해 주세요';
    refresh();
    const res = await saveFile(filename, blob);
    if (res === 'saved') { toast('받았어요'); markSuno(song.id); }
    else if (res === 'unavailable') toast('이 화면에서는 파일을 받을 수 없어요');
  } catch {
    toast('파일을 만들지 못했어요. 다시 눌러 주세요');
  } finally {
    pkg.busy = '';
    refresh();
  }
}

export function renderExport(song) {
  const lyrics = buildLyrics(song, opts);
  const style = buildStyle(song.style);
  const title = song.title.replace(/^예시:\s*/, '');

  const block = (id, label, text, limit, rows) => {
    const ta = h('textarea', { id, 'aria-label': label, class: 'out mono', rows: String(rows), readonly: true, value: text });
    const over = limit && text.length > limit;
    return h('section', { class: 'card' },
      h('div', { class: 'card-head' },
        h('h2', null, label),
        h('div', { class: 'row' },
          limit ? h('span', { class: `mono muted${over ? ' over' : ''}` }, `${text.length} / ${limit}자`) : null,
          h('button', { type: 'button', class: 'btn primary', onclick: () => { copyText(ta.value, ta); markSuno(song.id); } }, '복사'))),
      over ? h('p', { class: 'warn' }, '한도를 넘었어요. Suno가 뒷부분을 경고 없이 자를 수 있어요.') : null,
      !over && id === 'out-lyrics' && text.length > SUNO_LIMITS.lyricsOld ? h('p', { class: 'muted small' }, `V4 이하 모델을 쓸 거라면 가사는 ${SUNO_LIMITS.lyricsOld.toLocaleString()}자까지예요 (V4.5 이후는 ${limit.toLocaleString()}자).`) : null,
      ta);
  };

  const toggle = (key, label) => h('label', { class: 'check' },
    h('input', { type: 'checkbox', id: `opt-${key}`, checked: opts[key], onchange: (e) => { opts[key] = e.target.checked; refresh(); } }),
    label);

  const hasMelody = Object.values(song.music.sections).some((sm) => sm.melody.length);
  const arrKey = keyName(song.music.root, song.music.mode);
  const styleMismatch = Number(song.style.bpm) !== song.music.bpm || (song.style.key || '').trim() !== arrKey;
  const instOf = song.instOf ? getState().songs.find((x) => x.id === song.instOf) : null;
  return h('div', { class: 'stack' },
    song.instOf ? h('section', { class: 'card note', id: 'inst-guide' },
      h('h2', null, '연주곡(Inst.) 버전 만들기'),
      h('p', null, `이 곡은 「${(instOf?.title || '원곡').replace(/^예시:\s*/, '')}」의 Inst. 버전이에요. Suno에서 둘 중 하나로 만들어 마스터링 탭에 넣으세요.`),
      h('ol', null,
        h('li', null, 'Create에서 Instrumental을 켜고, 아래 Styles(원곡과 같은 스타일)로 만들기'),
        h('li', null, '원곡 결과에서 보컬을 뺀 연주(스템)를 받기 — 요금제에 따라 다를 수 있어요'))) : null,
    h('section', { class: 'card' },
      h('h2', null, '제작 패키지 받기'),
      h('p', { class: 'muted' }, '가사·스타일 텍스트, 악기별 MIDI, 데모 WAV, 작업 안내서를 zip 하나로 받아요. 데모 WAV를 Suno의 Upload Audio → Cover에 넣으면 내 코드 진행과 멜로디를 살린 채 완성곡을 만들 수 있어요.'),
      hasMelody ? null : h('p', { class: 'warn' }, '아직 멜로디가 없어요. 멜로디 탭에서 만들면 데모에 가이드 멜로디가 들어가요.'),
      h('div', { class: 'row' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'pkg-wav', checked: pkg.includeWav, onchange: (e) => { pkg.includeWav = e.target.checked; } }), '데모 WAV 포함 (용량 큼, 수십 초 걸림)'),
        h('button', { type: 'button', class: 'btn primary', disabled: !!pkg.busy, onclick: () => downloadPackage(song) }, 'zip 받기'),
        pkg.busy ? h('span', { class: 'status' }, h('span', { class: 'dot' }), h('span', { id: 'pkg-status' }, pkg.busy)) : null)),
    h('section', { class: 'card steps' },
      h('h2', null, 'Suno에 가사만 넣을 때'),
      h('ol', null,
        h('li', null, 'suno.com → Create → ', h('strong', null, 'Custom'), ' 모드를 켠다'),
        h('li', null, 'Lyrics 칸에 아래 가사를 붙여넣는다'),
        h('li', null, 'Styles 칸에 스타일을, Exclude styles에 제외 항목을 붙여넣는다'),
        h('li', null, 'Title을 넣고 Create. 마음에 드는 결과가 나오면 버전 탭에 메모와 함께 저장해 둔다')),
      h('div', { class: 'row' },
        toggle('memberTags', '섹션 태그에 보컬 톤 넣기'),
        toggle('arrangeHints', '섹션 태그에 편곡 힌트 넣기'),
        toggle('keepAdlibs', '(괄호) 애드립 유지'))),
    styleMismatch ? h('section', { class: 'card' },
      h('p', { class: 'warn' }, `Suno 스타일(${song.style.bpm || '—'} BPM, ${song.style.key || '키 없음'})이 편곡(${song.music.bpm} BPM, ${arrKey})과 달라요. 데모 WAV를 Suno에 올릴 거라면 맞추는 게 좋아요.`),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn small', onclick: () => mutateSong(song.id, (x) => applyToStyle(x)) }, '편곡 값으로 맞추기'))) : null,
    block('out-lyrics', 'Lyrics', lyrics, SUNO_LIMITS.lyrics, 16),
    block('out-style', 'Styles', style, SUNO_LIMITS.style, 3),
    song.style.exclude ? block('out-exclude', 'Exclude styles', song.style.exclude, 0, 2) : null,
    block('out-title', 'Title', title, SUNO_LIMITS.title, 1),
    renderTranslate(song, opts),
  );
}
