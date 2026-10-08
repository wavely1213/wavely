// 내보내기 탭 > 다른 언어 버전: 번안 가사 만들기, 원문과 음 수 비교, Suno용 가사·스타일 복사.
import { h, copyText } from '../dom.js';
import { mutateSong, refresh } from '../state.js';
import { isBusy, runJob } from '../aijob.js';
import { LANGS, translateLyrics, translationStatus, compareLines, translatedSong } from '../translate/translate.js';
import { FIT_TOLERANCE } from '../translate/mora.js';
import { buildLyrics, buildStyle } from '../suno.js';
import { SUNO_LIMITS } from '../constants.js';
import { help } from '../help.js';

const ui = { lang: 'ja' };

export function renderTranslate(song, lyricOpts) {
  const busy = isBusy();
  const lang = ui.lang;
  const L = LANGS[lang];
  const status = translationStatus(song, lang);
  const hasLyrics = song.sections.some((s) => s.text.trim());
  const run = () => runJob(`${L.name} 번안 중`, async (signal) => {
    const res = await translateLyrics(song, lang, { signal });
    mutateSong(song.id, (x) => { x.translations = { ...(x.translations || {}), [lang]: res }; });
  });
  const groups = status === 'none' ? [] : compareLines(song, lang);
  const rows = groups.flatMap((g) => g.rows);
  const off = rows.filter((r) => r.fit === false).length;
  const missing = rows.filter((r) => !r.tr).length;
  const lyrics = status === 'none' ? '' : buildLyrics(translatedSong(song, lang), lyricOpts);
  const style = [buildStyle(song.style), L.suno].filter(Boolean).join(', ');
  const copyBlock = (id, label, text, limit, n) => {
    const ta = h('textarea', { id, 'aria-label': label, class: 'out mono', rows: String(n), readonly: true, value: text });
    return h('div', { class: 'stack' },
      h('div', { class: 'row' },
        h('strong', null, label),
        h('span', { class: 'push' }),
        h('span', { class: `mono muted${text.length > limit ? ' over' : ''}` }, `${text.length} / ${limit}자`),
        h('button', { type: 'button', class: 'btn small primary', onclick: () => copyText(ta.value, ta) }, '복사')),
      ta);
  };

  return h('section', { class: 'card' },
    h('div', { class: 'card-head' },
      h('h2', null, '다른 언어 버전 (번안 가사)'),
      h('button', { type: 'button', class: 'btn', id: 'translate-run', disabled: busy || !hasLyrics, onclick: run }, status === 'none' ? `${L.name}로 번안하기` : '다시 번안')),
    h('p', { class: 'muted small' }, lang === 'ja' ? help('mora') : null, `같은 멜로디로 부를 수 있게 줄마다 ${L.unit} 수를 원문 음절 수에 맞춘 가사를 만들어요. Suno에 같은 스타일로 넣으면 ${L.name} 버전이 나와요. 발매 전에 원어민 확인을 권해요.`),
    h('div', { class: 'chips' }, Object.entries(LANGS).map(([k, v]) => h('button', {
      type: 'button', class: `chip${k === lang ? ' on' : ''}`, 'aria-pressed': k === lang ? 'true' : 'false',
      onclick: () => { ui.lang = k; refresh(); },
    }, `${v.name}${song.translations?.[k] ? ' ✓' : ''}`))),
    status === 'none' ? null : h('div', { class: 'stack' },
      status === 'stale' ? h('p', { class: 'warn' }, '번안한 뒤 원문 가사가 바뀌었어요. 다시 번안해 주세요.') : null,
      missing ? h('p', { class: 'warn', id: 'tr-missing' }, `${missing}줄은 번안이 빠졌어요 (—). Suno 가사에는 원문 그대로 들어가요. 다시 번안해 주세요.`) : null,
      off ? h('p', { class: 'warn' }, `${off}줄이 원문과 ${FIT_TOLERANCE}음 넘게 차이 나요 (빨간 숫자). 멜로디에 안 맞으면 다시 번안하거나 Suno에서 들어 보고 고르세요.`)
        : missing ? null : h('p', { class: 'good-text' }, '모든 줄이 원문 음 수와 비슷해요.'),
      h('div', { class: 'tr-table' }, groups.map((g) => h('div', { class: 'tr-sec' },
        h('span', { class: 'tag mono' }, `[${g.label}]`),
        g.rows.map((r) => h('div', { class: 'tr-row' },
          h('span', { class: 'tr-src' }, r.line, h('span', { class: 'mono muted small' }, ` ${r.want}`)),
          r.tr ? h('span', { class: 'tr-dst' },
            r.tr.text,
            h('span', { class: `mono small ${r.fit ? 'muted' : 'over'}` }, ` ${r.tr.count}`),
            r.tr.kana && r.tr.kana !== r.tr.text ? h('span', { class: 'tr-kana muted small' }, r.tr.kana) : null)
            : h('span', { class: 'tr-dst muted' }, '—')))))),
      copyBlock('out-lyrics-tr', `Lyrics (${L.name})`, lyrics, SUNO_LIMITS.lyrics, 10),
      copyBlock('out-style-tr', `Styles (${L.name} 버전)`, style, SUNO_LIMITS.style, 2)),
  );
}
