// 리메이크·번안 프로젝트: 원곡 정보, 이용 허락 기록, 원곡 가사(번안 음 수 비교용). 결정: D-026.
// 근거: docs/research/cover-remake-2026-10-12.md. 앱은 절차를 안내하고 빠진 것을 점검할 뿐, 이용 허락은 사람이 직접 받는다.
// 곡에 저장: song.remake (리메이크·번안 곡에만). 섹션이 아니라 곡 단위 — importSong이 섹션의 다른 칸을 지우기 때문.
import { countSyllables } from '../lyrictools.js';
import { countMora, FIT_TOLERANCE } from '../translate/mora.js';
import { makeSection } from '../structure.js';
import { names } from '../album/splits.js';
import { INSTRUMENTAL_TYPES } from '../constants.js';

// 가사를 바꾸면(외국곡 번안, 같은 언어 개사) 번안. 리메이크는 편곡만 새로, 커버는 그대로
export const REMAKE_KINDS = {
  adapt: { name: '번안', detail: '원곡에 새 한국어 가사를 붙여 새로 녹음해요(외국곡 번안, 같은 언어 개사). 개사·번역과 편곡 동의가 필요해요.' },
  remake: { name: '리메이크', detail: '가사·멜로디는 그대로 두고 편곡을 새로 해요. 편곡 동의가 필요해요. 가사를 바꾸면 번안을 골라요.' },
  cover: { name: '커버', detail: '가사·멜로디·편곡을 바꾸지 않고 다시 녹음해요. 국내 음원 사이트는 원곡자의 서면 동의서가 있어야 받아요.' },
};
export const DEFAULT_KIND = 'adapt';

// 원곡 언어: 번안 음 수는 일본어면 모라(kana 읽기), 영어·한국어는 음절로 센다. 기타 언어는 세지 않는다 (D-026 ⑨)
export const ORIGINAL_LANGS = { ja: '일본어', en: '영어', ko: '한국어', other: '기타' };
export const COUNTED_LANGS = ['ja', 'en', 'ko'];
const HAN = /\p{Script=Han}/u;

// 이용 허락 항목. kinds: 이 종류면 꼭 '승인'이어야 하는 것. 제목 변경·원곡 음원은 해당할 때만, AI는 확인 항목
export const CONSENTS = [
  { id: 'adapt', name: '개사·번역', kinds: ['adapt'] },
  { id: 'arrange', name: '편곡', kinds: ['adapt', 'remake'] },
  { id: 'retitle', name: '제목 변경', kinds: [] },
  { id: 'audio', name: '원곡 음원·MR 사용', kinds: [] },
  { id: 'ai', name: 'AI 사용', kinds: [] },
];
export const CONSENT_STATUS = { none: '요청 전', requested: '요청함', approved: '승인', denied: '거절' };
export const SOCIETIES = ['', 'KOMCA', 'KOSCAP', 'JASRAC', 'NexTone', '모름'];
export const RESEND_DAYS = 14; // 답이 없으면 다시 보내는 기준 (Sony Music Publishing Japan 안내)

// 권리자 조회는 사람이 한다 (KOMCA는 자동 조회를 막는다). 결과(E·SE 칸)는 원곡 정보에 옮겨 적는다
export const SEARCH_LINKS = [
  { name: 'KOMCA 저작물 검색', url: 'https://www.komca.or.kr/srch2/srch_01.jsp' },
  { name: 'KOSCAP', url: 'https://www.koscap.or.kr/' },
  { name: 'J-WID (JASRAC 작품 검색)', url: 'https://www2.jasrac.or.jp/eJwid/' },
];

const emptyConsent = () => ({ status: 'none', requestedAt: '', answeredAt: '', memo: '' });
const str = (v) => (typeof v === 'string' ? v : '');

export function newRemake(kind = DEFAULT_KIND) {
  return {
    kind: REMAKE_KINDS[kind] ? kind : DEFAULT_KIND,
    original: { title: '', artist: '', lyricists: '', composers: '', arrangers: '', year: '', language: 'ja' },
    publisher: { original: '', subPublisherKR: '', society: '' },
    consents: Object.fromEntries(CONSENTS.map((c) => [c.id, emptyConsent()])),
    proofFile: '', // 서면 동의서 파일 이름만 (파일은 저장하지 않음)
    usesOriginalAudio: false,
    aiUsed: false, // AI 번안 초안을 쓰면 켜진다
    // { [sectionId]: [{ text, kana, count }] } — 내 저장소(계정·이 브라우저)와 전체 백업에만, 제작 패키지에선 뺀다
    originalLyrics: { lang: 'ja', sections: {} },
  };
}

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
// 칸마다 글자만 (가져온 파일·손으로 고친 백업의 null·숫자·배열이 화면과 점검표를 깨지 않게)
const strings = (base, v) => Object.fromEntries(Object.keys(base).map((k) => [k, str(isObj(v) ? v[k] : '') || base[k]]));

// 저장된 곡의 remake를 지금 모양으로 (빠진 칸 채우기, 잘못된 값 버리기, 지운 섹션의 원곡 가사 정리)
export function normalizeRemake(song) {
  if (!song || !('remake' in song)) return song;
  const r = song.remake;
  if (!isObj(r)) { delete song.remake; return song; }
  const base = newRemake(r.kind);
  r.kind = base.kind;
  r.original = strings(base.original, r.original);
  if (!ORIGINAL_LANGS[r.original.language]) r.original.language = 'ja';
  r.publisher = strings(base.publisher, r.publisher);
  r.consents = Object.fromEntries(CONSENTS.map((c) => {
    const x = strings(emptyConsent(), r.consents?.[c.id]);
    if (!CONSENT_STATUS[x.status]) x.status = 'none';
    return [c.id, x];
  }));
  r.proofFile = str(r.proofFile);
  r.usesOriginalAudio = !!r.usesOriginalAudio;
  r.aiUsed = !!r.aiUsed;
  const ol = isObj(r.originalLyrics) && isObj(r.originalLyrics.sections) ? r.originalLyrics.sections : {};
  const ids = new Set(song.sections.map((s) => s.id));
  const lang = r.original.language;
  r.originalLyrics = {
    lang,
    sections: Object.fromEntries(Object.entries(ol).filter(([id, lines]) => ids.has(id) && Array.isArray(lines))
      .map(([id, lines]) => [id, lines.map((l) => originalLine(l?.text, l?.kana, lang)).filter((l) => l.text)])),
  };
  return song;
}

// 원곡 한 줄의 음 수: 일본어는 읽기(kana) 모라 — 읽기 없이 한자가 있으면 셀 수 없어 null, 영어·한국어는 음절, 기타는 null
export function originalCount(text, lang, kana = '') {
  if (lang === 'ja') return !kana && HAN.test(text) ? null : countMora(kana || text);
  return COUNTED_LANGS.includes(lang) ? countSyllables(text) : null;
}

// 읽기는 언어를 바꿔도 남겨 둔다 (일본어로 되돌리면 다시 쓰인다). 세는 데만 언어를 본다
export function originalLine(text, kana = '', lang = 'ja') {
  const t = str(text).trim().slice(0, 200);
  const k = str(kana).trim().slice(0, 200);
  return { text: t, kana: k, count: originalCount(t, lang, lang === 'ja' ? k : '') };
}

// Inst. 사본은 원곡 곡의 권리 기록을 따른다 (원곡 곡에서 허락 상태를 고치면 같이 바뀌게). 원곡 곡이 없으면 사본의 기록
export function remakeOf(song, songs = []) {
  if (!song) return null;
  if (song.instOf) return songs.find((x) => x.id === song.instOf)?.remake || song.remake || null;
  return song.remake || null;
}

const clean = (t) => String(t || '').replace(/^예시:\s*/, '');
const squash = (t) => clean(t).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

// 곡 제목이 원제와 다르면 제목 변경 동의가 필요하다 (제호의 동일성, 저작권법 제13조). Inst. 표시는 빼고 본다
export function titleChanged(song, remake = song?.remake) {
  const o = squash(remake?.original?.title);
  if (!o) return false;
  return squash(clean(song.title).replace(/\s*\(Inst\.\)\s*$/i, '')) !== o;
}

// 이 곡에 꼭 '승인'이어야 하는 동의 항목 id. Inst.는 가사가 없어 개사·번역은 빼고 본다
export function requiredConsents(song, remake = song?.remake) {
  if (!remake) return [];
  const ids = CONSENTS.filter((c) => c.kinds.includes(remake.kind)).map((c) => c.id).filter((id) => !(song.instOf && id === 'adapt'));
  if (titleChanged(song, remake)) ids.push('retitle');
  if (remake.usesOriginalAudio) ids.push('audio');
  return ids;
}

// 승인 전인 필수 항목: [{ id, name, status }]
export function pendingConsents(song, remake = song?.remake) {
  return requiredConsents(song, remake).map((id) => ({ ...CONSENTS.find((c) => c.id === id), status: remake.consents[id]?.status || 'none' }))
    .filter((c) => c.status !== 'approved');
}

// ---------- 원곡 가사 붙여넣기 ----------
// 머리말 → 섹션 종류. 일본어 [Aメロ]·[Bメロ]·[サビ]·[Cメロ], 영어 [Verse 1], 한국어 [벌스]·[후렴]
const HEADS = [
  [/^(?:a\s*メロ|aメロ|verse|벌스|절)/i, 'Verse'],
  [/^(?:b\s*メロ|bメロ|pre[\s-]*chorus|프리\s*코러스)/i, 'Pre-Chorus'],
  [/^(?:post[\s-]*chorus|포스트\s*코러스)/i, 'Post-Chorus'],
  [/^(?:大サビ|ラスサビ|落ちサビ|サビ|chorus|코러스|후렴)/i, 'Chorus'],
  [/^(?:[cd]\s*メロ|bridge|브릿지)/i, 'Bridge'],
  [/^(?:イントロ|intro|인트로)/i, 'Intro'],
  [/^(?:アウトロ|outro|아웃트로)/i, 'Outro'],
  [/^(?:hook|훅)/i, 'Hook'],
  [/^(?:rap|ラップ|랩)/i, 'Rap'],
];
// 대괄호 머리말만 (괄호 한 줄은 애드립이라 머리말로 보지 않는다)
const HEAD_LINE = /^\s*[[【〔]\s*([^\]】〕]+?)\s*[\]】〕]\s*$/;
// 머리말이 없을 때 빈 줄로 나눈 덩어리에 붙이는 순서 (J-pop 흔한 구조 A-B-サビ). 같은 가사 덩어리는 앞의 종류를 그대로
const GUESS = ['Verse', 'Pre-Chorus', 'Chorus', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Chorus'];

export function headType(label) {
  const t = String(label || '').trim();
  return HEADS.find(([re]) => re.test(t))?.[1] || null;
}

// 반환: [{ type, lines: [text] }]. 아는 머리말 아래는 빈 줄이 있어도 한 섹션. 모르는 머리말([1番]·[台詞] 등)과
// 머리말 없는 가사는 빈 줄로 나누고 종류를 짐작한다. 가사 없는 모르는 머리말([間奏] 등)은 섹션을 만들지 않는다.
// 전각 글자([Ａメロ]·［サビ］)는 반각으로 맞춰 본다
export function parseOriginalLyrics(text) {
  const blocks = [];
  let cur = null;
  const close = () => { if (cur && (cur.lines.length || cur.type)) blocks.push(cur); cur = null; };
  String(text || '').replace(/\r/g, '').split('\n').forEach((raw) => {
    const line = raw.trim();
    const head = HEAD_LINE.exec(line.normalize('NFKC'));
    if (head) {
      close();
      cur = { type: headType(head[1]), lines: [] };
      return;
    }
    if (!line) { if (cur && !cur.type) close(); return; }
    if (!cur) cur = { type: null, lines: [] };
    cur.lines.push(line.slice(0, 200));
  });
  close();
  const out = [];
  let g = 0;
  blocks.forEach((b) => {
    if (!b.type) {
      if (!b.lines.length) return;
      const same = out.find((x) => x.lines.join('\n') === b.lines.join('\n'));
      b.type = same ? same.type : GUESS[Math.min(g, GUESS.length - 1)];
      g += 1;
    }
    if (b.type === 'Intro' || b.type === 'Outro' || b.lines.length) out.push({ type: b.type, lines: b.lines });
  });
  return out;
}

// 다시 붙여넣을 때 같은 원곡 줄에 적어 둔 읽기(kana)는 이어 쓴다
function linesWithKana(song, lines) {
  const r = song.remake;
  const known = new Map(Object.values(r.originalLyrics?.sections || {}).flat().filter((l) => l.kana).map((l) => [l.text, l.kana]));
  return lines.map((l) => originalLine(l, known.get(l.trim()) || '', r.original.language));
}

// 붙여넣은 원곡 가사로 섹션을 새로 만든다. 번안은 한국어 가사 칸을 비우고 원곡 가사를 따로 두고,
// 리메이크·커버는 원곡 가사가 곧 부를 가사라 섹션 가사로 넣는다. 반환: 새 섹션 배열
export function applyOriginalLyrics(song, blocks) {
  const r = song.remake;
  const sections = blocks.map((b) => makeSection(b.type, r.kind === 'adapt' ? '' : b.lines.join('\n')));
  const ol = r.kind === 'adapt' ? Object.fromEntries(sections.map((s, i) => [s.id, linesWithKana(song, blocks[i].lines)]).filter(([, l]) => l.length)) : {};
  song.sections = sections;
  r.originalLyrics = { lang: r.original.language, sections: ol };
  return sections;
}

// 번안: 섹션·한국어 가사·멜로디는 그대로 두고 원곡 가사만 지금 섹션에 순서대로 붙인다 (제작 패키지로 옮긴 곡 등).
// 가사를 부르는 섹션(인트로·댄스 브레이크·아웃트로 제외)과 붙여넣은 덩어리를 차례로 짝짓는다. 반환: { attached, blocks, sections }
export function attachOriginalLyrics(song, blocks) {
  const r = song.remake;
  const targets = song.sections.filter((s) => !INSTRUMENTAL_TYPES.includes(s.type));
  const sung = blocks.filter((b) => b.lines.length);
  const n = Math.min(targets.length, sung.length);
  const ol = {};
  for (let i = 0; i < n; i++) ol[targets[i].id] = linesWithKana(song, sung[i].lines);
  r.originalLyrics = { lang: r.original.language, sections: ol };
  return { attached: n, blocks: sung.length, sections: targets.length };
}

// ---------- 번안 음 수 비교 ----------
const linesOf = (text) => String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);

const origText = (lines) => (lines || []).map((l) => l.text).join('\n');

// 섹션의 한국어 가사 줄. 비워 둔 섹션은 원곡 가사가 똑같은 반복(같은 종류)일 때만 앞 섹션 가사로 본다 —
// 가사지는 비운 섹션을 앞의 같은 종류 섹션으로 채우는데(album/lyrics.js plainLyrics), 원곡 2절이 다르면 따로 써야 하므로
function koreanLines(song, i, ol) {
  const s = song.sections[i];
  if (s.text.trim()) return { lines: linesOf(s.text), fromPrev: false };
  const prev = song.sections.slice(0, i).reverse().find((p) => p.type === s.type && p.text.trim());
  return prev && origText(ol[prev.id]) === origText(ol[s.id]) ? { lines: linesOf(prev.text), fromPrev: true } : { lines: [], fromPrev: false };
}

// 원곡 줄과 한국어 줄을 나란히: [{ id, index, type, rows: [{ orig, ko, want, have, fit }], extra }]
// want가 null이면 셀 수 없는 줄(읽기 없는 한자 줄, 기타 언어) — 맞는지 판단하지 않는다
export function compareAdapt(song) {
  const ol = song.remake?.originalLyrics?.sections || {};
  return song.sections.map((s, i) => ({ s, i, orig: ol[s.id] })).filter((x) => x.orig?.length).map(({ s, i, orig }) => {
    const { lines: ko, fromPrev } = koreanLines(song, i, ol);
    return {
      id: s.id, index: i, type: s.type, fromPrev,
      rows: orig.map((o, j) => {
        const line = ko[j] || '';
        const have = line ? countSyllables(line) : 0;
        return { orig: o, ko: line, want: o.count, have, fit: line && o.count != null ? Math.abs(have - o.count) <= FIT_TOLERANCE : null };
      }),
      extra: Math.max(0, ko.length - orig.length), // 원곡보다 많은 줄
    };
  });
}

// { lines, missing, off, extra, unread } — 번안 가사 단계가 끝났는지(진행 단계)와 화면 요약에 쓴다.
// unread: 일본어 원곡에서 읽기(kana)를 안 적은 한자 줄 (음 수를 셀 수 없음)
export function adaptSummary(song) {
  const groups = compareAdapt(song);
  const rows = groups.flatMap((g) => g.rows);
  const ja = song.remake?.original?.language === 'ja';
  return {
    lines: rows.length, missing: rows.filter((r) => !r.ko).length, off: rows.filter((r) => r.fit === false).length,
    extra: groups.reduce((a, g) => a + g.extra, 0), unread: ja ? rows.filter((r) => r.want == null).length : 0,
  };
}

// ---------- 크레딧 ----------
// 원곡 정보로 트랙 크레딧을 채운다 (빈 칸만). name: 내 이름(번안 작사·새 편곡). 비우면 원곡 정보만 넣는다.
// 번안곡 작사 칸은 원 작사와 번안 작사를 함께 적는다 (D-026: 국내 사례 「Find The Way」식, 소유자 확인 필요)
export function remakeCredits(remake, name = '') {
  const o = remake.original;
  const join = (...xs) => [...new Set(xs.flatMap((x) => names(x)))].join(', ');
  const adapt = remake.kind === 'adapt';
  return {
    lyricists: adapt ? join(o.lyricists, name) : join(o.lyricists),
    koreanLyricists: adapt ? join(name) : '',
    composers: join(o.composers),
    arrangers: remake.kind === 'cover' ? join(o.arrangers || name) : join(name),
  };
}

// 리메이크·번안 곡을 앨범에 넣을 때 빈 크레딧 칸을 원곡 정보로 미리 채운다 (Inst. 사본은 작사 없음 — fillCredits가 다룸)
export function prefillTrack(track, song) {
  if (!song?.remake || song.instOf) return track;
  Object.entries(remakeCredits(song.remake)).forEach(([k, v]) => { if (v && !String(track[k] || '').trim()) track[k] = v; });
  return track;
}

// 크레딧 문서·가사집에 넣는 원곡 줄
export function originalCreditLines(remake, track = {}) {
  const o = remake.original;
  const p = remake.publisher;
  const lines = [
    `원곡: "${o.title || '-'}" / ${o.artist || '-'}${o.year ? ` (${o.year})` : ''}`,
    `원 작사: ${o.lyricists || '-'} / 원 작곡: ${o.composers || '-'}${o.arrangers ? ` / 원 편곡: ${o.arrangers}` : ''}`,
  ];
  if (p.original || p.subPublisherKR) lines.push(`원출판사(OP): ${p.original || '-'} / 국내 서브퍼블리셔(SE): ${p.subPublisherKR || '-'}`);
  if (remake.kind === 'adapt' && track.koreanLyricists) lines.push(`한국어 가사: ${track.koreanLyricists}`); // 종류를 바꾼 뒤 남은 값은 쓰지 않는다
  return lines;
}

// 제출 패키지 rights.csv: 리메이크·번안 트랙마다 서면 동의서(증빙) 한 줄 + 동의 항목별 상태·날짜·메모 (필수 항목 + 기록이 있는 항목).
// 커버처럼 필수 동의가 없어도 증빙 줄은 늘 넣는다 (국내 음원 사이트 규칙)
export function rightsRows(album, songs) {
  const rows = [['Track', 'Title', 'Kind', 'Original Title', 'Original Artist', 'Original Lyricist', 'Original Composer', 'Original Publisher', 'Sub-publisher (KR)', 'Society', 'Consent', 'Required', 'Status', 'Requested', 'Answered', 'Memo', 'Proof File']];
  album.tracks.forEach((t, i) => {
    const s = songs.find((x) => x.id === t.songId);
    const r = remakeOf(s, songs);
    if (!r) return;
    const need = requiredConsents(s, r);
    const o = r.original;
    const p = r.publisher;
    const head = [i + 1, clean(s.title), REMAKE_KINDS[r.kind].name, o.title, o.artist, o.lyricists, o.composers, p.original, p.subPublisherKR, p.society];
    rows.push([...head, '서면 동의서(증빙)', 'Y', r.proofFile ? '파일 있음' : '없음', '', '', '', r.proofFile]);
    CONSENTS.filter((c) => need.includes(c.id) || r.consents[c.id].status !== 'none').forEach((c) => {
      const x = r.consents[c.id];
      rows.push([...head, c.name, need.includes(c.id) ? 'Y' : 'N', CONSENT_STATUS[x.status], x.requestedAt, x.answeredAt, x.memo, r.proofFile]);
    });
  });
  return rows;
}

// 제출 패키지 지문에 넣을 것 (원곡 가사는 패키지에 안 들어가므로 뺀다)
export function remakeKey(remake) {
  if (!remake) return null;
  const { originalLyrics, ...rest } = remake;
  return rest;
}
