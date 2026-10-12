// 리메이크·번안 곡 화면: 컨셉 탭의 원곡·이용 허락 기록, 구조·가사 탭의 원곡 가사·번안 비교, 내보내기 탭의 Suno 안내. 결정: D-026.
import { h, field, afterBlur, toast } from '../dom.js';
import { mutate, mutateSong, selectSong, getState, refresh } from '../state.js';
import { isBusy, runJob } from '../aijob.js';
import { sectionLabels } from '../structure.js';
import { REMAKE_KINDS, ORIGINAL_LANGS, CONSENTS, CONSENT_STATUS, SOCIETIES, SEARCH_LINKS, RESEND_DAYS,
  remakeOf, requiredConsents, pendingConsents, parseOriginalLyrics, applyOriginalLyrics, compareAdapt, adaptSummary, originalLine } from '../remake/model.js';
import { adaptToKorean, applyAdapt } from '../remake/adapt.js';
import { FIT_TOLERANCE } from '../translate/mora.js';
import { help } from '../help.js';

const clean = (t) => String(t || '').replace(/^예시:\s*/, '');

// 곡별 화면 메모 (저장하지 않음): 붙여넣은 원곡 가사, 섹션을 다시 나눌지 확인 중인지
const memo = {};
const memoOf = (id) => memo[id] || (memo[id] = { paste: '', confirm: false });

// ---------- 컨셉 탭: 원곡 정보·권리자·이용 허락 ----------
export function renderRemakeRights(song) {
  const { songs } = getState();
  if (song.instOf) {
    const src = songs.find((x) => x.id === song.instOf);
    if (!src?.remake) return null;
    return h('section', { class: 'card note', id: 'remake-rights' },
      h('h2', null, '원곡·이용 허락'),
      h('p', null, `이 Inst. 버전은 「${clean(src.title)}」의 원곡 정보와 이용 허락 기록을 따라요.`),
      h('button', { type: 'button', class: 'btn small', onclick: () => selectSong(src.id) }, '그 곡에서 고치기'));
  }
  const r = song.remake;
  const quiet = (fn) => (e) => mutate((s) => fn(s.remake, e.target.value), 'quiet');
  const text = (id, label, get, set, placeholder = '') => field(label, h('input', { id, value: get(r), placeholder, oninput: quiet(set), onchange: afterBlur(() => mutate(() => {})) }));
  const need = requiredConsents(song);
  const wait = pendingConsents(song);

  const kinds = h('div', { class: 'chips', role: 'group', 'aria-label': '프로젝트 종류' }, Object.entries(REMAKE_KINDS).map(([k, v]) => h('button', {
    type: 'button', id: `remake-kind-${k}`, class: `chip${r.kind === k ? ' on' : ''}`, 'aria-pressed': r.kind === k ? 'true' : 'false',
    onclick: () => mutate((s) => { s.remake.kind = k; }),
  }, v.name)));

  const consentRows = CONSENTS.map((c) => {
    const x = r.consents[c.id];
    const set = (key) => (e) => mutate((s) => { s.remake.consents[c.id][key] = e.target.value; }, key === 'memo' ? 'quiet' : 'all');
    return h('div', { class: 'consent-row' },
      h('span', { class: 'consent-name' }, c.name, need.includes(c.id) ? h('span', { class: 'tag small' }, ' 필요') : null),
      h('select', { id: `consent-${c.id}`, 'aria-label': `${c.name} 상태`, onchange: set('status') },
        Object.entries(CONSENT_STATUS).map(([k, v]) => h('option', { value: k, selected: x.status === k }, v))),
      h('input', { type: 'date', id: `consent-${c.id}-req`, 'aria-label': `${c.name} 요청한 날`, value: x.requestedAt, onchange: set('requestedAt') }),
      h('input', { type: 'date', id: `consent-${c.id}-ans`, 'aria-label': `${c.name} 답 받은 날`, value: x.answeredAt, onchange: set('answeredAt') }),
      h('input', { id: `consent-${c.id}-memo`, 'aria-label': `${c.name} 메모`, value: x.memo, placeholder: '조건·연락처 메모', oninput: set('memo') }));
  });

  return h('section', { class: 'card', id: 'remake-rights' },
    h('h2', null, '리메이크·번안 — 원곡과 이용 허락'),
    h('p', { class: 'muted' }, help('remake'), '앱은 절차를 안내하고 빠진 것을 점검해요. 이용 허락은 직접 받아야 하고, 이 안내는 법률 자문이 아니에요.'),
    kinds,
    h('p', { class: 'muted small' }, REMAKE_KINDS[r.kind].detail),
    h('h3', null, '원곡 정보'),
    h('div', { class: 'grid2' },
      text('orig-title', '원곡 제목', (x) => x.original.title, (x, v) => { x.original.title = v; }, '예: 雪の華'),
      text('orig-artist', '원곡 아티스트', (x) => x.original.artist, (x, v) => { x.original.artist = v; }),
      text('orig-lyricists', '원 작사', (x) => x.original.lyricists, (x, v) => { x.original.lyricists = v; }, '여러 명은 쉼표'),
      text('orig-composers', '원 작곡', (x) => x.original.composers, (x, v) => { x.original.composers = v; }, '여러 명은 쉼표'),
      text('orig-arrangers', '원 편곡 (선택)', (x) => x.original.arrangers, (x, v) => { x.original.arrangers = v; }),
      text('orig-year', '발표 연도 (선택)', (x) => x.original.year, (x, v) => { x.original.year = v; }, '예: 2003'),
      field('원곡 언어', h('select', { id: 'orig-lang', onchange: (e) => mutate((s) => { s.remake.original.language = e.target.value; }) },
        Object.entries(ORIGINAL_LANGS).map(([k, v]) => h('option', { value: k, selected: r.original.language === k }, v))))),
    h('h3', null, '권리자'),
    h('p', { class: 'muted small' }, help('publisher'), '검색 결과의 E(원출판사)·SE(국내 서브퍼블리셔) 칸을 옮겨 적어요. 검색에 안 나온다고 써도 되는 건 아니에요.'),
    h('div', { class: 'row' }, SEARCH_LINKS.map((l) => h('a', { class: 'btn small ghost', href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.name))),
    h('div', { class: 'grid2' },
      text('pub-op', '원출판사 (OP)', (x) => x.publisher.original, (x, v) => { x.publisher.original = v; }),
      text('pub-se', '국내 서브퍼블리셔 (SE)', (x) => x.publisher.subPublisherKR, (x, v) => { x.publisher.subPublisherKR = v; }, '없으면 비워 두기'),
      field('관리 단체', h('select', { id: 'pub-society', onchange: (e) => mutate((s) => { s.remake.publisher.society = e.target.value; }) },
        SOCIETIES.map((v) => h('option', { value: v, selected: r.publisher.society === v }, v || '고르기'))))),
    h('h3', null, '이용 허락'),
    h('p', { class: 'muted small' }, help('consent'), `국내 SE가 있으면 SE에, 없으면 원출판사에 서면으로 요청해요. 한국어 가사·일본어 직역·데모·발매 계획을 함께 보내고, ${RESEND_DAYS}일 동안 답이 없으면 다시 보내요. 답이 오기까지 수 주~수 개월 걸려요.`),
    h('div', { class: 'consent-list' },
      h('div', { class: 'consent-row consent-head muted small', 'aria-hidden': 'true' }, h('span', null, '항목'), h('span', null, '상태'), h('span', null, '요청한 날'), h('span', null, '답 받은 날'), h('span', null, '메모')),
      consentRows),
    h('div', { class: 'grid2' },
      text('remake-proof', '서면 동의서 파일 이름', (x) => x.proofFile, (x, v) => { x.proofFile = v; }, '예: 동의서_雪の華_2026.pdf (파일은 저장하지 않아요)')),
    h('div', { class: 'row' },
      h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'remake-audio', checked: r.usesOriginalAudio, onchange: (e) => mutate((s) => { s.remake.usesOriginalAudio = e.target.checked; }) }), '원곡 음원·MR·스템을 써요'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', id: 'remake-ai', checked: r.aiUsed, onchange: (e) => mutate((s) => { s.remake.aiUsed = e.target.checked; }) }), 'AI 번안 초안을 썼어요')),
    wait.length
      ? h('p', { class: 'warn', id: 'remake-wait' }, `아직 승인 전: ${wait.map((c) => `${c.name}(${CONSENT_STATUS[c.status]})`).join(', ')}. 서면 허락 전에는 본 녹음·발매일 확정·유통 제출을 멈춰요. 허락 신청용 데모는 만들어도 돼요.`)
      : h('p', { class: 'good-text', id: 'remake-wait' }, need.length ? '필요한 허락을 모두 승인으로 기록했어요.' : '이 종류는 따로 필요한 동의 항목이 없어요. 그래도 국내 음원 사이트에 내려면 원곡자의 서면 동의서가 필요해요.'));
}

// ---------- 구조·가사 탭: 원곡 가사 붙여넣기, 번안 음 수 비교 ----------
export function renderOriginalLyrics(song) {
  const r = song.remake;
  if (!r || song.instOf) return null;
  const m = memoOf(song.id);
  const adapt = r.kind === 'adapt';
  const busy = isBusy();
  const hasWork = song.sections.some((s) => s.text.trim()) || Object.values(song.music.sections).some((sm) => sm.melody.length) || !!song.progress?.arranged;
  const split = () => {
    const blocks = parseOriginalLyrics(m.paste);
    if (!blocks.length) { toast('나눌 가사가 없어요'); return; }
    mutate((s) => { applyOriginalLyrics(s, blocks); });
    m.confirm = false;
    m.paste = '';
    toast(`섹션 ${blocks.length}개로 나눴어요`);
  };
  const paste = h('textarea', { id: 'remake-paste', rows: '6', 'aria-label': '원곡 가사 붙여넣기', value: m.paste,
    placeholder: '[Aメロ]\n原曲の歌詞をここに\n\n[サビ]\n…\n\n머리말이 없으면 빈 줄로 섹션을 나눠요.', oninput: (e) => { m.paste = e.target.value; } });
  const groups = adapt ? compareAdapt(song) : [];
  const sum = adapt ? adaptSummary(song) : null;
  const labels = sectionLabels(song.sections);
  const ja = r.original.language === 'ja';

  return h('section', { class: 'card', id: 'remake-lyrics' },
    h('h2', null, adapt ? '원곡 가사와 번안' : '원곡 가사 붙여넣기'),
    h('p', { class: 'muted' }, adapt
      ? ['원곡 가사를 붙여넣으면 섹션을 나누고, 줄마다 원곡 음 수와 한국어 음절 수를 나란히 보여 줘요. 한국어 가사는 아래 섹션 칸에 써요. 원곡 가사는 이 기기에만 두고 제작 패키지에는 넣지 않아요. ', ja ? help('mora') : null]
      : '원곡 가사를 붙여넣으면 [サビ]·[Verse] 같은 머리말이나 빈 줄로 섹션을 나눠 아래 가사 칸에 넣어요.'),
    paste,
    m.confirm
      ? h('div', { class: 'confirm' },
        h('span', null, '지금 섹션의 가사·멜로디·편곡이 모두 새 섹션으로 바뀌어요. 먼저 버전 탭에서 저장해 두는 걸 권해요.'),
        h('button', { type: 'button', class: 'btn danger', id: 'remake-split-ok', onclick: split }, '바꾸고 나누기'),
        h('button', { type: 'button', class: 'btn ghost', onclick: () => { m.confirm = false; refresh(); } }, '취소'))
      : h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', id: 'remake-split', onclick: () => {
        if (!m.paste.trim()) { toast('원곡 가사를 먼저 붙여넣어 주세요'); return; }
        if (hasWork) { m.confirm = true; refresh(); } else split();
      } }, '섹션 나누기')),
    adapt && groups.length ? h('div', { class: 'stack' },
      h('div', { class: 'row' },
        h('span', { class: 'mono small', id: 'adapt-summary' }, `${sum.lines}줄 · 빈 줄 ${sum.missing} · 음 수 차이 큼 ${sum.off}${sum.extra ? ` · 원곡보다 많은 줄 ${sum.extra}` : ''}`),
        h('span', { class: 'push' }),
        h('button', { type: 'button', class: 'btn', id: 'adapt-run', disabled: busy, onclick: () => runJob('번안 초안 만드는 중', async (signal) => {
          const res = await adaptToKorean(song, { signal });
          let n = 0;
          mutateSong(song.id, (x) => { n = applyAdapt(x, res); });
          toast(n ? `섹션 ${n}개에 번안 초안을 넣었어요` : '그사이 가사를 쓴 섹션은 그대로 뒀어요');
        }) }, 'AI 번안 초안 (빈 섹션만)')),
      h('p', { class: 'muted small' }, `줄마다 한국어 음절 수가 원곡 음 수와 ${FIT_TOLERANCE}음 넘게 차이 나면 빨갛게 보여요. AI 초안을 쓰면 AI 사용으로 기록돼요(점검표가 허락서의 AI 항목을 확인해요).`),
      h('div', { class: 'tr-table', id: 'adapt-table' }, groups.map((g) => h('div', { class: 'tr-sec' },
        h('span', { class: 'tag mono' }, `[${labels[g.index]}]${g.fromPrev ? ' 앞 섹션 가사' : ''}`),
        g.rows.map((row, j) => h('div', { class: 'tr-row' },
          h('span', { class: 'tr-src' },
            row.orig.text, h('span', { class: 'mono muted small' }, ` ${row.want}`),
            ja ? h('input', { class: 'tr-kana small', id: `kana-${g.id}-${j}`, 'aria-label': `${labels[g.index]} ${j + 1}번째 줄 읽기(가나)`, value: row.orig.kana, placeholder: '읽기(かな) — 한자가 있으면 적어야 음 수가 맞아요',
              oninput: (e) => mutate((s) => { const ol = s.remake.originalLyrics.sections[g.id]; ol[j] = originalLine(ol[j].text, e.target.value, 'ja'); }, 'quiet'),
              onchange: afterBlur(() => mutate(() => {})) }) : null),
          row.ko ? h('span', { class: 'tr-dst' }, row.ko, h('span', { class: `mono small ${row.fit ? 'muted' : 'over'}` }, ` ${row.have}`))
            : h('span', { class: 'tr-dst muted' }, '—')))))))
      : null);
}

// ---------- 내보내기 탭: Suno 안내 (D-026: 경고 후 허용) ----------
export function renderRemakeSuno(song) {
  const { songs } = getState();
  const r = remakeOf(song, songs);
  if (!r) return null;
  const wait = pendingConsents(song, r);
  return h('section', { class: 'card note', id: 'remake-suno' },
    h('h2', null, '커버·번안 곡을 Suno로 만들기 전에'),
    wait.length ? h('p', { class: 'warn' }, `아직 이용 허락 전이에요(${wait.map((c) => c.name).join('·')}). 허락 전에는 신청용 데모까지만 만들어요.`) : null,
    h('ul', null,
      h('li', null, 'Suno에 올리는 가사·오디오는 모든 권리와 동의를 가졌다고 보증해야 하고, 그 자료로 Suno가 모델을 학습해도 된다는 것까지 포함해요. 원곡 음원·원곡 가사는 올리지 마세요.'),
      h('li', null, 'Suno의 Cover 기능은 본인이 만든 곡에만 써요. 남의 곡으로 만든 결과는 수익화할 수 없어서, 허락받은 곡이어도 Suno 음원으로 상업 발매하기 어려워요.'),
      h('li', null, '더 안전한 길: 멜로디 탭에 원곡 멜로디를 입력해 제작 패키지의 demo.wav로 허락 신청용 데모를 만들고, 서면 허락을 받은 뒤 사람이 한국어 가사로 녹음해요. MR은 사람 편곡자나 DAW로 만들어요.')),
    h('p', { class: 'muted small' }, '기준: Suno 약관(2026-09-03 시행)·도움말. 발매 전에 최신 약관을 확인하세요.'));
}
