// 앨범: 곡 묶음 + 발매 메타데이터 + 커버 설정 + 일정 체크. 오디오·이미지는 저장하지 않는다(용량).
import { uid } from '../dom.js';
import { syncStatus } from './lrc.js';
import { similarityStatus } from '../optimize/similarity.js';
import { spellingStatus } from '../optimize/spelling.js';
import { splitsFor, splitIssues } from './splits.js';
import { explicitWords } from './explicit.js';

export const ALBUM_TYPES = {
  single: { name: '싱글', min: 1, max: 3 },
  ep: { name: 'EP (미니앨범)', min: 4, max: 6 },
  album: { name: '정규 앨범', min: 7, max: 30 },
};

export function newAlbum() {
  const year = new Date().getFullYear();
  return {
    id: `album_${uid()}`,
    kind: 'album',
    title: '새 앨범',
    artist: '',
    type: 'single',
    genre: 'K-Pop',
    subgenre: 'Dance',
    language: '한국어',
    releaseDate: isoDate(addDays(new Date(), 42)),
    label: '',
    upc: '',
    cLine: `${year} `,
    pLine: `${year} `,
    explicit: false,
    ai: { lyrics: true, composition: true, vocals: true, note: '' },
    description: '',
    tracks: [],
    cover: { template: 'gradient', palette: 0, subtitle: '' },
    schedule: {},
    promo: { intro: '', tracks: {}, sns: [], hashtags: '', pitch: '', pitchKo: '' },
    submittedAt: 0, // 꼭 고칠 것 없이 제출 패키지를 마지막으로 받은 때 (진행 단계용)
    submittedKey: '', // 그때 패키지 내용의 지문 (바뀌면 다시 받기)
    stats: [], // 발매 후 성과 기록 [{ date, plays: { songId: 누적 재생 수 } }]
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function newTrack(songId) {
  return { songId, isTitle: false, isrc: '', lyricists: '', composers: '', arrangers: '', featuring: '', explicit: false, splits: {} };
}

export function normalizeAlbum(a) {
  const base = newAlbum();
  Object.keys(base).forEach((k) => { if (a[k] === undefined) a[k] = base[k]; });
  a.ai = { ...base.ai, ...a.ai };
  a.cover = { ...base.cover, ...a.cover };
  a.promo = { ...base.promo, ...a.promo };
  a.tracks = a.tracks.map((t) => ({ ...newTrack(t.songId), ...t }));
  return a;
}

// ---------- 날짜 ----------
export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
export function isoDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}
export function daysUntil(s, today = new Date()) {
  const d = parseDate(s);
  if (!d) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d - t) / 86400000);
}

// ---------- 발매 일정표 ----------
// offset: 발매일 기준 날짜 차이(음수 = 발매 전)
export const SCHEDULE = [
  { id: 'final-songs', offset: -42, title: '수록곡·마스터 확정', detail: '마스터링 탭에서 곡마다 발매용 WAV(-14 LUFS, -1 dBTP)를 받아 둔다.' },
  { id: 'cover-meta', offset: -35, title: '커버·메타데이터·크레딧 확정', detail: '커버 3000×3000, 작사·작곡·편곡 크레딧, 장르, 언어.' },
  { id: 'distributor', offset: -28, title: '유통사에 제출', detail: '제출 패키지 zip으로 업로드. 국내 플랫폼 검수 기간은 유통사 안내를 확인.' },
  { id: 'copyright', offset: -21, title: '저작권 신고 준비', detail: '한국음악저작권협회(KOMCA) 등 작품 신고 대상인지 확인하고 작사·작곡 정보를 맞춘다.' },
  { id: 'pitch', offset: -14, title: '플레이리스트 피칭', detail: 'Spotify for Artists는 발매 최소 7일 전까지 미발매곡 한 곡을 피칭할 수 있다.' },
  { id: 'teaser-plan', offset: -14, title: '티저 계획', detail: '컨셉 이미지·하이라이트 공개 날짜를 정한다.' },
  { id: 'teaser', offset: -7, title: '티저·하이라이트 공개', detail: '숏폼용 15~30초 하이라이트(코러스) 공개.' },
  { id: 'final-check', offset: -3, title: '플랫폼 등록 정보 확인', detail: '유통사 대시보드에서 제목·크레딧·발매일·커버가 맞는지 확인.' },
  { id: 'release', offset: 0, title: '발매', detail: 'SNS 공지, 링크 공유.' },
  { id: 'verify', offset: 1, title: '플랫폼 반영 확인', detail: '가사·크레딧·커버가 각 플랫폼에 제대로 보이는지.' },
  { id: 'week1', offset: 7, title: '1주 차 점검', detail: '재생 수·저장 수 확인, 숏폼 2차 공개.' },
  { id: 'next', offset: 14, title: '다음 활동 계획', detail: '반응 좋은 곡·구간을 정리해 다음 곡 컨셉에 반영.' },
];

export function scheduleFor(album, today = new Date()) {
  const rel = parseDate(album.releaseDate);
  return SCHEDULE.map((s) => {
    const date = rel ? addDays(rel, s.offset) : null;
    const left = date ? daysUntil(isoDate(date), today) : null;
    const done = !!album.schedule[s.id];
    return { ...s, date: date ? isoDate(date) : '', left, done, overdue: !done && left != null && left < 0 };
  });
}

// ---------- 발매 전 점검표 ----------
// masters: { [songId]: {sampleRate, bits, lufs, peak, name} } (화면 메모리), coverInfo: {width, height} | null
const ISRC = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;
export const ALBUM_LOUDNESS_GAP = 3; // LU. 이보다 크게 차이 나면 경고

export function releaseChecklist(album, songs, { masters = {}, coverInfo = null, today = new Date() } = {}) {
  const items = [];
  // go: 고치러 갈 곳 — { tab } (앨범 탭) 또는 { song, tab } (곡 화면 탭)
  const add = (level, text, go = null) => items.push({ level, text, go });
  const type = ALBUM_TYPES[album.type];
  const tracks = album.tracks.filter((t) => songs.some((s) => s.id === t.songId));

  if (!album.title.trim() || album.title === '새 앨범') add('error', '앨범 제목을 정해 주세요.', { tab: 'meta' });
  if (!album.artist.trim()) add('error', '아티스트명을 적어 주세요.', { tab: 'meta' });
  if (!tracks.length) add('error', '수록곡이 없어요.', { tab: 'tracks' });
  else if (tracks.length < type.min || tracks.length > type.max) add('warn', `${type.name}은 보통 ${type.min}~${type.max}곡이에요 (지금 ${tracks.length}곡).`, { tab: 'tracks' });
  if (tracks.length > 1 && !tracks.some((t) => t.isTitle)) add('warn', '타이틀곡을 정해 주세요.', { tab: 'tracks' });
  const left = daysUntil(album.releaseDate, today);
  if (left == null) add('error', '발매 예정일을 정해 주세요.', { tab: 'schedule' });
  else if (left < 28) add('warn', `발매일까지 ${left}일 남았어요. 유통사 검수·피칭을 생각하면 4주 이상 여유를 두는 게 안전해요.`, { tab: 'schedule' });
  if (!album.cLine.trim() || /^\d{4}\s*$/.test(album.cLine)) add('warn', '© 표기(저작권자)를 적어 주세요. 예: 2026 물결뮤직', { tab: 'meta' });
  if (album.upc.trim() && !/^\d{12,13}$/.test(album.upc.replace(/[\s-]/g, ''))) add('warn', `UPC는 숫자 12~13자리예요 (지금 "${album.upc}").`, { tab: 'meta' });
  if (!album.pLine.trim() || /^\d{4}\s*$/.test(album.pLine)) add('warn', '℗ 표기(음원 제작자)를 적어 주세요.', { tab: 'meta' });

  tracks.forEach((t, i) => {
    const song = songs.find((s) => s.id === t.songId);
    const n = `${i + 1}번 「${song.title.replace(/^예시:\s*/, '')}」`;
    if (!t.lyricists.trim() && !song.instOf) add('error', `${n}: 작사 크레딧이 비어 있어요.`, { tab: 'meta' });
    if (t.isrc.trim() && !ISRC.test(t.isrc.replace(/[\s-]/g, '').toUpperCase())) add('warn', `${n}: ISRC 형식이 아니에요 (예: KR-A01-26-00001, 12자리).`, { tab: 'meta' });
    if (!t.composers.trim()) add('error', `${n}: 작곡 크레딧이 비어 있어요.`, { tab: 'meta' });
    splitIssues(t).forEach((r) => add('warn', r.missing.length
      ? `${n}: ${r.name} 지분에 ${r.missing.join('·')}의 %가 없어요 (지금 0%). 합 100%가 되게 적어 주세요.`
      : `${n}: ${r.name} 지분 합이 ${r.sum}%예요. 100%가 되게 맞춰 주세요.`, { tab: 'meta' }));
    const shared = splitsFor(t).filter((r) => r.people.length > 1 && !r.custom).map((r) => r.name);
    if (shared.length) add('info', `${n}: ${shared.join('·')}을 여럿이 했는데 지분을 안 적어 똑같이 나눈 것으로 적었어요. 합의한 비율이 다르면 정보·크레딧에서 고치세요.`, { tab: 'meta' });
    if (!song.instOf && !song.sections.some((s) => s.text.trim())) add('warn', `${n}: 가사가 없어요 (연주곡이면 무시).`, { song: song.id, tab: 'editor' });
    const rude = t.explicit ? [] : explicitWords(song.sections.map((s) => s.text).join('\n'));
    if (rude.length) add('warn', `${n}: 가사에 욕설로 보이는 말(${rude.slice(0, 3).join(', ')})이 있는데 19금(Explicit) 표시가 꺼져 있어요. 플랫폼은 표시가 틀리면 내리거나 반려할 수 있어요.`, { tab: 'meta' });
    const m = masters[t.songId];
    const sim = similarityStatus(song);
    if (sim === 'flagged') add('warn', `${n}: 유사 표현 점검에서 확인할 줄이 남았어요.`, { song: song.id, tab: 'editor' });
    else if (song.sections.some((s) => s.text.trim()) && (sim === 'none' || sim === 'stale')) add('info', `${n}: 유사 표현 점검을 ${sim === 'none' ? '아직 안 했어요' : '가사를 고친 뒤 다시 안 했어요'} (구조·가사 탭 맨 아래).`, { song: song.id, tab: 'editor' });
    const spell = spellingStatus(song);
    if (spell === 'flagged') add('info', `${n}: 맞춤법 점검에서 고칠 곳이 남았어요 (플랫폼 가사에 그대로 보여요).`, { song: song.id, tab: 'editor' });
    const sync = syncStatus(song);
    if (sync === 'stale') add('warn', `${n}: 싱크 가사를 맞춘 뒤 가사가 바뀌었어요. 다시 맞춰 주세요 (안 하면 패키지에서 빠져요).`, { tab: 'sync' });
    else if (sync === 'partial' || sync === 'order') add('warn', `${n}: 싱크 가사를 덜 맞췄어요 (패키지에서 빠져요).`, { tab: 'sync' });
    else if (sync === 'ok' && m && Number.isFinite(m.duration) && Number.isFinite(song.sync.duration) && Math.abs(m.duration - song.sync.duration) > 1) add('warn', `${n}: 싱크 가사를 맞춘 마스터와 지금 마스터의 길이가 달라요. 다시 맞춰 주세요.`, { tab: 'sync' });
    if (!m) add('error', `${n}: 마스터 WAV를 넣어 주세요.`, { tab: 'tracks' });
    else {
      if (!/\.wav$/i.test(m.name)) add('error', `${n}: 마스터는 WAV여야 해요 (지금 ${m.name}).`, { tab: 'tracks' });
      if (m.sampleRate && m.sampleRate < 44100) add('error', `${n}: 샘플레이트가 ${m.sampleRate}Hz예요. 44.1kHz 이상이어야 해요.`, { tab: 'tracks' });
      if (m.bits && m.bits < 16) add('error', `${n}: ${m.bits}비트예요. 16비트 이상이어야 해요.`, { tab: 'tracks' });
      if (m.format === 3) add('error', `${n}: 32비트 float WAV예요. 대부분의 유통사는 16·24비트 PCM만 받아요 — 마스터링 탭에서 다시 받으세요.`, { tab: 'tracks' });
      if (/\.wav$/i.test(m.name) && m.format == null) add('warn', `${n}: WAV 형식 정보를 읽지 못했어요. 마스터링 탭에서 다시 받은 파일을 권해요.`, { tab: 'tracks' });
      if (m.channels === 1) add('warn', `${n}: 모노 파일이에요. 보통 스테레오로 제출해요.`, { tab: 'tracks' });
      if (!Number.isFinite(m.lufs)) add('error', `${n}: 소리가 거의 없는 파일이에요. 파일을 확인해 주세요.`, { tab: 'tracks' });
      if (Number.isFinite(m.peak) && m.peak > -0.5) add('warn', `${n}: 트루 피크 ${m.peak.toFixed(1)} dBTP — 마스터링 탭에서 -1 dBTP로 맞추는 걸 권해요.`, { tab: 'tracks' });
      if (Number.isFinite(m.lufs) && (m.lufs < -18 || m.lufs > -6)) add('warn', `${n}: 음량 ${m.lufs.toFixed(1)} LUFS — 일반적인 범위(-18~-6)를 벗어났어요.`, { tab: 'tracks' });
    }
  });

  // 앨범으로 이어 들을 때 곡마다 크기가 달라지지 않게 (스트리밍 앨범 재생은 곡 사이 음량 차이를 그대로 둔다)
  const loud = tracks.map((t, i) => ({ i, song: songs.find((s) => s.id === t.songId), lufs: masters[t.songId]?.lufs })).filter((x) => Number.isFinite(x.lufs));
  if (loud.length > 1) {
    const hi = loud.reduce((a, b) => (b.lufs > a.lufs ? b : a));
    const lo = loud.reduce((a, b) => (b.lufs < a.lufs ? b : a));
    const gap = hi.lufs - lo.lufs;
    const name = (x) => `${x.i + 1}번 「${x.song.title.replace(/^예시:\s*/, '')}」`;
    if (gap > ALBUM_LOUDNESS_GAP) add('warn', `곡마다 음량 차이가 ${gap.toFixed(1)} LU예요 (가장 큼 ${name(hi)} ${hi.lufs.toFixed(1)}, 가장 작음 ${name(lo)} ${lo.lufs.toFixed(1)} LUFS). 이어 들으면 크기가 튀어요 — 마스터링 탭에서 같은 목표 음량으로 맞추세요. 발라드를 일부러 작게 했다면 무시해도 돼요.`, { song: lo.song.id, tab: 'master' });
  }

  if (!coverInfo) add('error', '커버 이미지를 만들거나 넣어 주세요.', { tab: 'cover' });
  else {
    if (coverInfo.width !== coverInfo.height) add('error', `커버가 정사각형이 아니에요 (${coverInfo.width}×${coverInfo.height}).`, { tab: 'cover' });
    const d = coverInfo.drawnWith;
    if (d && (d.title !== album.title || d.artist !== album.artist)) add('warn', `커버 글자("${d.title}" / "${d.artist}")가 지금 앨범 정보와 달라요. 커버 탭에서 다시 만들어 주세요 — 다르면 유통사가 반려할 수 있어요.`, { tab: 'cover' });
    if (Math.min(coverInfo.width, coverInfo.height) < 3000) add('warn', `커버가 ${coverInfo.width}×${coverInfo.height}예요. 대부분의 유통사는 3000×3000을 권해요.`, { tab: 'cover' });
  }
  if (album.ai.lyrics || album.ai.composition || album.ai.vocals) add('info', 'AI 생성 사용을 표기했어요. 유통사·플랫폼의 AI 음원 정책을 제출 전에 확인하세요.');
  return items;
}

// 빈 크레딧을 이름 하나로 채운다 (혼자 만든 경우). 연주곡(Inst.)은 작사가 없으므로 작사는 비워 둔다.
export function fillCredits(album, songs, name) {
  album.tracks.forEach((t) => {
    const inst = songs.find((s) => s.id === t.songId)?.instOf;
    if (!t.lyricists && !inst) t.lyricists = name;
    if (!t.composers) t.composers = name;
    if (!t.arrangers) t.arrangers = name;
  });
}

// ---------- 메타데이터 CSV ----------
function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(rows) {
  return `﻿${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export function trackFileName(i, title, ext = 'wav') {
  const clean = (title || 'Untitled').replace(/^예시:\s*/, '').replace(/[\\/:*?"<>|]+/g, '').trim();
  return `${String(i + 1).padStart(2, '0')} ${clean}.${ext}`;
}

// 실제 파일의 확장자 (없으면 wav)
export function extOf(name) {
  const m = /\.([a-z0-9]{2,5})$/i.exec(name || '');
  return m ? m[1].toLowerCase() : 'wav';
}

export function metadataRows(album, songs, masters = {}) {
  const head = ['Disc', 'Track', 'Title', 'Artist', 'Featuring', 'Lyricist', 'Composer', 'Arranger', 'ISRC', 'Title Track', 'Explicit', 'Language', 'Genre', 'Sub-genre', 'Duration (s)', 'File'];
  const rows = [head];
  album.tracks.forEach((t, i) => {
    const song = songs.find((s) => s.id === t.songId);
    if (!song) return;
    const m = masters[t.songId];
    rows.push(['1', String(i + 1), song.title.replace(/^예시:\s*/, ''), album.artist, t.featuring, t.lyricists, t.composers, t.arrangers, t.isrc,
      t.isTitle ? 'Y' : 'N', t.explicit ? 'Y' : 'N', album.language, album.genre, album.subgenre, m?.duration ? String(Math.round(m.duration)) : '', trackFileName(i, song.title, extOf(m?.name))]);
  });
  return rows;
}

export function albumRows(album) {
  const aiUsed = [album.ai.lyrics && '가사', album.ai.composition && '작곡', album.ai.vocals && '보컬'].filter(Boolean).join(', ') || '없음';
  return [
    ['Field', 'Value'],
    ['Album Title', album.title],
    ['Artist', album.artist],
    ['Type', ALBUM_TYPES[album.type].name],
    ['Release Date', album.releaseDate],
    ['Genre', album.genre],
    ['Sub-genre', album.subgenre],
    ['Language', album.language],
    ['Label', album.label],
    ['UPC', album.upc],
    ['(C) Line', album.cLine],
    ['(P) Line', album.pLine],
    ['Explicit', album.explicit || album.tracks.some((t) => t.explicit) ? 'Y' : 'N'],
    ['AI Generated', aiUsed],
    ['AI Note', album.ai.note],
    ['Description', album.description],
  ];
}
