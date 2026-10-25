// 직접 녹음해서 발매하기: Suno로 MR·가이드 보컬까지 만들고, 그 MR에 내가 직접 녹음해 발매한다. 결정: D-027.
// 곡에 저장: song.recording = { self: true, singerId, voice } (직접 녹음할 때만). 부를 사람 음역에 맞는 키를 찾고,
// 녹음용 안내(가사·마디표)를 만들고, 발매 점검표가 AI 표기(보컬)를 확인한다.
import { degreeToMidi, keyName } from '../music/theory.js';
import { VOICE_RANGES, defaultVoice, midiName } from '../music/range.js';
import { sectionLabels, autoDistribute } from '../structure.js';
import { INSTRUMENTAL_TYPES } from '../constants.js';
import { GENRE_PROFILES } from '../music/genres.js';
import { uid } from '../dom.js';

export const DEFAULT_SELF_VOICE = 'm-baritone'; // 멤버가 없을 때 부를 사람 음역 (소유자 목소리 기본값)

export const recordingOf = (song) => (song?.recording?.self ? song.recording : null);

// 노래하는 멤버 (음역이 랩이 아닌 멤버)
export const sungMembers = (song) => (song.members || []).filter((m) => (m.voice || defaultVoice(song.concept?.group, m.position)) !== 'rap');

// 부를 사람: 고른 멤버 → 첫 노래 멤버 → 없으면 음역만
export function singerOf(song) {
  const r = recordingOf(song);
  if (!r) return null;
  const sung = sungMembers(song);
  const m = sung.find((x) => x.id === r.singerId) || sung[0] || null;
  const voice = m ? m.voice || defaultVoice(song.concept?.group, m.position) : (VOICE_RANGES[r.voice] ? r.voice : DEFAULT_SELF_VOICE);
  return { member: m, voice, range: VOICE_RANGES[voice] };
}

// '나를 솔로 멤버로 추가' (mutate 안에서): AI 멜로디·음역 점검이 내 음역을 보게 한다. 바리톤이면 바리톤 보컬 톤.
// 멤버가 없던 곡이면 노래 섹션을 모두 맡기고 컨셉 그룹을 솔로로, 멤버가 있던 곡(예: 래퍼만)이면 나눈 파트는 두고 비어 있는 섹션만 맡긴다.
// 반환: 그룹을 솔로로 바꿨는지
export function addSelfMember(song) {
  const voice = song.recording?.voice || DEFAULT_SELF_VOICE;
  const had = song.members.length > 0;
  const me = { id: uid(), name: '나', position: '메인보컬', voice, tone: voice === 'm-baritone' ? GENRE_PROFILES.ballad_classic.seed.vocalsBaritone : '' };
  song.members.push(me);
  song.recording = { ...(song.recording || { self: true, voice }), singerId: me.id };
  if (!had) {
    song.sections = autoDistribute(song.sections, song.members);
    song.concept.group = voice.startsWith('m-') ? 'solo_m' : 'solo_f';
    return true;
  }
  const mine = autoDistribute(song.sections, [me]);
  song.sections = song.sections.map((s, i) => (s.members.length ? s : mine[i]));
  return false;
}

// 멜로디 칸 범위 (views/melody.js의 TOP·BOTTOM, ai-music.js foldRange와 같은 값). 키를 옮길 때 멜로디 도수가 이 밖으로 나가지 않게 한다
const GRID_LOW = -3;
const GRID_HIGH = 10;

// 들리는 음표만 (섹션 마디를 줄이면 뒤 음표는 남아 있어도 재생·피아노롤에 나오지 않는다. timeline.js와 같은 기준)
const heard = (sm) => (sm?.melody || []).filter((n) => n.s < (sm.bars || 0) * 16);
const heardNotes = (song) => song.sections.flatMap((sec) => heard(song.music.sections[sec.id]));

// 가이드 멜로디의 음높이 범위 (MIDI). 음표가 없으면 null
export function melodySpan(song, root = song.music.root, octave = 0, notes = heardNotes(song)) {
  if (!notes.length) return null;
  const ms = notes.map((n) => degreeToMidi(root, song.music.mode, n.d + 7 * octave));
  return { low: Math.min(...ms), high: Math.max(...ms) };
}

const fits = (span, range) => span.low >= range.low && span.high <= range.high;
const overflow = (span, range) => Math.max(0, range.low - span.low) + Math.max(0, span.high - range.high);

// 내 음역에 맞는 키: 으뜸음(0~11)을 모두 바꿔 보고, 멜로디를 한 옥타브 옮겨도 멜로디 칸(-3~10) 안이면 옥타브도 바꿔 본다.
// 코드·멜로디가 같이 옮겨진다(도수로 저장하므로). 맞는 것 중 덜 옮기는 것, 같으면 멜로디 가운데가 음역 가운데에 가까운 것.
// 맞는 게 없으면 가장 덜 넘치는 것. why: 'wide'(멜로디 폭이 음역보다 넓음) | 'grid'(멜로디 칸 안에서는 더 옮길 수 없음)
// 반환: { span, range, fits, best: { root, octave, shift, span, fits }, why } | null(멜로디 없음·음역 무관)
export function fitKey(song, range = singerOf(song)?.range) {
  const notes = heardNotes(song);
  if (!notes.length || !range || range.low == null) return null;
  const span = melodySpan(song, song.music.root, 0, notes);
  const root = song.music.root;
  const mid = (range.low + range.high) / 2;
  const dLow = Math.min(...notes.map((n) => n.d));
  const dHigh = Math.max(...notes.map((n) => n.d));
  const cands = [];
  for (let r = 0; r < 12; r++) {
    for (const octave of [0, -1, 1]) {
      if (octave && (dLow + 7 * octave < GRID_LOW || dHigh + 7 * octave > GRID_HIGH)) continue;
      const sp = melodySpan(song, r, octave, notes);
      cands.push({ root: r, octave, shift: r - root + 12 * octave, span: sp, fits: fits(sp, range), over: overflow(sp, range), off: Math.abs((sp.low + sp.high) / 2 - mid) });
    }
  }
  const ok = cands.filter((c) => c.fits);
  const pool = ok.length ? ok : cands;
  pool.sort((a, b) => (ok.length ? 0 : a.over - b.over) || Math.abs(a.shift) - Math.abs(b.shift) || a.off - b.off);
  const { over, off, ...best } = pool[0];
  const why = best.fits ? null : span.high - span.low > range.high - range.low ? 'wide' : 'grid';
  return { span, range, fits: fits(span, range), best, why };
}

// 찾은 키가 지금 키와 같은지 (옮길 것이 없음)
export const isCurrentKey = (best) => best.shift === 0 && !best.octave;

// 찾은 키로 옮긴다 (mutate 안에서). 스타일 탭의 키가 비었거나 편곡 키와 같았으면 같이 바꾼다 (Suno가 같은 키로 MR을 만들게)
export function applyKey(song, best) {
  const m = song.music;
  const key = (song.style?.key || '').trim();
  const synced = song.style && (!key || key === keyName(m.root, m.mode));
  m.root = best.root;
  if (best.octave) Object.values(m.sections).forEach((sm) => { sm.melody = (sm.melody || []).map((n) => ({ ...n, d: Math.max(GRID_LOW, Math.min(GRID_HIGH, n.d + 7 * best.octave)) })); });
  if (synced) song.style.key = keyName(m.root, m.mode);
  return song;
}

// 맞지 않을 때 이유 한 줄 (내보내기 카드·recording_sheet.txt가 같이 쓴다)
export function fitHint(k) {
  if (!k || k.best.fits) return '';
  return k.why === 'wide' ? '멜로디 폭이 음역보다 넓어요' : '앱 멜로디 칸 안에서는 더 옮길 수 없어요. 멜로디 탭에서 부를 사람 음역으로 다시 만들거나 음을 옮겨 주세요';
}

export const spanText = (sp) => (sp ? `${midiName(sp.low)}~${midiName(sp.high)}` : '-');

// 제작 패키지의 recording_sheet.txt: 녹음 부스에서 볼 가사·마디표 (섹션·마디·부를 사람·가사)
export function recordingSheet(song) {
  const s = singerOf(song);
  const m = song.music;
  const labels = sectionLabels(song.sections);
  const k = fitKey(song);
  let bar = 1;
  const rows = song.sections.map((sec, i) => {
    const sm = m.sections[sec.id];
    const bars = sm?.bars || 0;
    const start = bar;
    bar += bars;
    let text = sec.text.trim();
    if (!text) text = song.sections.slice(0, i).reverse().find((p) => p.type === sec.type && p.text.trim())?.text.trim() || '';
    const sp = melodySpan(song, m.root, 0, heard(sm));
    const head = `[${labels[i]}] ${start}~${start + bars - 1}마디${sp ? ` · ${spanText(sp)}` : ''}`;
    return INSTRUMENTAL_TYPES.includes(sec.type) && !text ? `${head} (연주)` : [head, text || '(가사 없음)'].join('\n');
  });
  return [
    `${String(song.title || '').replace(/^예시:\s*/, '')} — 녹음용 가사·마디표`,
    `${keyName(m.root, m.mode)} · ${m.bpm} BPM · 4/4 · ${bar - 1}마디`,
    `부를 사람: ${s?.member?.name || '나'} (${s?.range?.name || '-'}${s?.range?.low != null ? ` ${spanText(s.range)}` : ''})`,
    k ? `가이드 멜로디: ${spanText(k.span)}${k.fits ? ' — 음역 안' : isCurrentKey(k.best) ? ` — 음역 밖, 이 키가 가장 덜 넘쳐요 (${fitHint(k)})` : ` — 음역 밖, 앱 기준 ${keyName(k.best.root, m.mode)}${k.best.octave ? `(멜로디 ${k.best.octave > 0 ? '한 옥타브 위' : '한 옥타브 아래'})` : ''}로 옮기면 ${k.best.fits ? '맞아요' : `덜 넘쳐요 (${fitHint(k)})`}`}` : '가이드 멜로디: 없음',
    '',
    song.remake
      ? '※ MR을 앱 편곡(song.mid)과 다르게 만들었다면 녹음은 MR의 빠르기·마디에 맞춰요.'
      : '※ Suno로 만든 MR은 빠르기·마디가 앱과 조금 다를 수 있어요. 녹음은 Suno 결과(MR·가이드 보컬 스템)에 맞춰요.',
    '',
    ...rows.flatMap((r) => [r, '']),
  ].join('\n');
}
