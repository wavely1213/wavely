// 발매 준비: 마스터 파일 점검, 가사지·크레딧, 유통사 제출 패키지(zip), AI 홍보 문구.
import { zipAsync } from '../music/pack.js';
import { measureAsync } from '../music/master.js';
import { getSample } from '../ai.js';
import { ALBUM_TYPES, scheduleFor, releaseChecklist, metadataRows, albumRows, toCsv, trackFileName, extOf } from './model.js';
import { plainLyrics } from './lyrics.js';
import { syncStatus, toLrc } from './lrc.js';
import { bookletHtml, blobToDataUrl } from './booklet.js';

export { plainLyrics };

// WAV 헤더에서 샘플레이트·비트 수 읽기 (decodeAudioData는 비트 수를 알려 주지 않는다)
export function wavHeader(bytes) {
  // 메타데이터 덩어리가 앞에 길게 붙는 파일도 있어 파일 전체에서 덩어리를 따라간다 (헤더만 읽으므로 빠름)
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (v.byteLength < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let o = 12;
  while (o + 8 <= v.byteLength) {
    const id = tag(o);
    const size = v.getUint32(o + 4, true);
    if (id === 'fmt ') {
      let format = v.getUint16(o + 8, true);
      if (format === 0xfffe && size >= 26) format = v.getUint16(o + 32, true); // WAVE_FORMAT_EXTENSIBLE의 실제 형식
      return { format, sampleRate: v.getUint32(o + 12, true), bits: v.getUint16(o + 22, true), channels: v.getUint16(o + 10, true) };
    }
    o += 8 + size + (size % 2);
  }
  return null;
}

// 반환: { file, name, sampleRate, bits, lufs, peak, duration }
export async function inspectMaster(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const head = wavHeader(bytes);
  const ctx = new OfflineAudioContext(2, 1, 44100);
  const buf = await ctx.decodeAudioData(bytes.slice().buffer);
  const ch = [buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)];
  const m = await measureAsync(ch, buf.sampleRate);
  // 샘플레이트는 헤더 값만 믿는다 (디코딩은 44.1kHz로 바꿔 버려 원래 값을 알 수 없음)
  return { file, name: file.name, sampleRate: head?.sampleRate || null, bits: head?.bits || null, format: head?.format ?? null, channels: head?.channels || buf.numberOfChannels, lufs: m.lufs, peak: m.peak, duration: buf.duration };
}

function credits(album, songs) {
  const lines = [`${album.artist} — ${album.title} (${ALBUM_TYPES[album.type].name}, ${album.releaseDate})`, ''];
  album.tracks.forEach((t, i) => {
    const s = songs.find((x) => x.id === t.songId);
    if (!s) return;
    lines.push(`${i + 1}. ${s.title.replace(/^예시:\s*/, '')}${t.isTitle ? ' (타이틀)' : ''}${t.featuring ? ` (Feat. ${t.featuring})` : ''}`);
    lines.push(`   작사: ${t.lyricists || '-'} / 작곡: ${t.composers || '-'} / 편곡: ${t.arrangers || '-'}`);
    if (t.isrc) lines.push(`   ISRC: ${t.isrc}`);
  });
  lines.push('', `© ${album.cLine}`, `℗ ${album.pLine}`);
  if (album.ai.lyrics || album.ai.composition || album.ai.vocals) {
    const used = [album.ai.lyrics && '가사', album.ai.composition && '작곡·편곡', album.ai.vocals && '보컬'].filter(Boolean).join(', ');
    lines.push('', `AI 사용: ${used}${album.ai.note ? ` — ${album.ai.note}` : ''}`);
  }
  return lines.join('\n');
}

function scheduleText(album) {
  return scheduleFor(album).map((s) => `[${s.done ? 'x' : ' '}] ${s.date} (D${s.offset >= 0 ? '+' : ''}${s.offset}) ${s.title} — ${s.detail}`).join('\n');
}

function safe(name) {
  return (name || 'album').replace(/^예시:\s*/, '').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 60) || 'album';
}

// masters: {songId: inspectMaster 결과}, cover: {blob, width, height} | null
export async function buildReleasePackage(album, songs, masters, cover, onStep = () => {}) {
  const root = safe(`${album.artist} - ${album.title}`);
  const files = [];
  const tracks = album.tracks.filter((t) => songs.some((s) => s.id === t.songId));
  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const song = songs.find((s) => s.id === t.songId);
    const m = masters[t.songId];
    if (m) {
      files.push({ name: `${root}/audio/${trackFileName(i, song.title, extOf(m.name))}`, data: m.file }); // 복사하지 않고 원본 파일 그대로
    }
    files.push({ name: `${root}/lyrics/${trackFileName(i, song.title, 'txt')}`, data: plainLyrics(song) });
    if (syncStatus(song) === 'ok') {
      files.push({ name: `${root}/lyrics/${trackFileName(i, song.title, 'lrc')}`, data: toLrc({ title: song.title.replace(/^예시:\s*/, ''), artist: album.artist, album: album.title, lines: song.sync.lines, duration: song.sync.duration }) });
    }
  }
  if (cover?.blob) files.push({ name: `${root}/cover.${cover.blob.type === 'image/png' ? 'png' : 'jpg'}`, data: cover.blob });
  onStep('가사집 만드는 중');
  files.push({ name: `${root}/booklet.html`, data: bookletHtml({ ...album, tracks }, songs, cover?.blob ? await blobToDataUrl(cover.blob) : '') });
  onStep('메타데이터 정리 중');
  files.push({ name: `${root}/metadata_tracks.csv`, data: toCsv(metadataRows({ ...album, tracks }, songs, masters)) });
  files.push({ name: `${root}/metadata_album.csv`, data: toCsv(albumRows(album)) });
  files.push({ name: `${root}/credits.txt`, data: credits({ ...album, tracks }, songs) });
  files.push({ name: `${root}/release_schedule.txt`, data: scheduleText(album) });
  const check = releaseChecklist(album, songs, { masters, coverInfo: cover });
  files.push({ name: `${root}/checklist.txt`, data: check.length ? check.map((c) => `[${c.level}] ${c.text}`).join('\n') : '점검 항목 없음 — 제출 준비 완료' });
  if (album.promo.intro || album.promo.sns.length) {
    const promo = [
      '[앨범 소개]', album.promo.intro, '',
      '[트랙 소개]', ...tracks.map((t, i) => `${i + 1}. ${songs.find((s) => s.id === t.songId)?.title.replace(/^예시:\s*/, '')}: ${album.promo.tracks[t.songId] || ''}`), '',
      '[SNS]', ...album.promo.sns.map((p, i) => `${i + 1}) ${p}`), '',
      album.promo.hashtags,
    ].join('\n');
    files.push({ name: `${root}/promo.txt`, data: promo });
  }
  files.push({ name: `${root}/README.txt`, data: [
    '유통사 제출 패키지',
    '',
    '- audio/: 트랙 번호 순 마스터 WAV (유통사 업로드용)',
    '- cover.jpg / cover.png: 커버 (정사각형, 3000×3000 권장)',
    '- metadata_album.csv / metadata_tracks.csv: 유통사 입력 화면에 옮겨 적을 값',
    '- lyrics/: 트랙별 가사 .txt (플랫폼 가사 등록용), 싱크 가사 .lrc (맞춘 곡만, 가사 따라가기용)',
    '- credits.txt: 크레딧 시트, release_schedule.txt: 발매 일정, checklist.txt: 제출 전 점검 결과',
    '- booklet.html: 가사집 (브라우저로 열어 인쇄 → PDF로 저장하면 디지털 부클릿)',
    '',
    'ISRC·UPC는 보통 유통사가 발급한다. 받은 뒤 앱의 앨범 메타데이터에 적어 두면 다음 패키지에 들어간다.',
  ].join('\n') });
  onStep('묶는 중');
  const blob = await zipAsync(files, (n, total) => onStep(`묶는 중 ${Math.round((n / Math.max(1, total)) * 100)}%`));
  return { blob, filename: `${root}.zip`, checklist: check };
}

// AI 홍보 문구 초안
export async function writePromo(album, songs, { signal }) {
  const sample = await getSample();
  if (!sample) throw { code: 'not_granted' };
  const tracks = album.tracks.map((t, i) => {
    const s = songs.find((x) => x.id === t.songId);
    if (!s) return null;
    return { id: s.id, 번호: i + 1, 제목: s.title.replace(/^예시:\s*/, ''), 타이틀: t.isTitle, 주제: s.concept.theme, 분위기: s.concept.moods.join(', '), 가사일부: plainLyrics(s).slice(0, 300) };
  }).filter(Boolean);
  const prompt = [
    '너는 K-pop 레이블 홍보 담당자다. 아래 앨범의 홍보 문구 초안을 한국어로 쓴다.',
    '과장된 수식어 남발 금지, 구체적인 이미지와 감정으로. 실존 아티스트와 비교하지 않는다.',
    `앨범: ${JSON.stringify({ 제목: album.title, 아티스트: album.artist, 종류: ALBUM_TYPES[album.type].name, 발매일: album.releaseDate, 소개메모: album.description })}`,
    `트랙: ${JSON.stringify(tracks)}`,
    '출력은 JSON 하나만: {"intro":"앨범 소개 3~5문장","tracks":[{"id":"","blurb":"트랙 소개 1~2문장"}],"sns":["발매 공지 글","티저 글","하이라이트 글"],"hashtags":"#해시태그 5~8개 공백 구분"}',
  ].join('\n\n');
  const res = await sample.json(prompt, { signal, cache: false });
  const ids = new Set(tracks.map((t) => t.id));
  return {
    intro: String(res?.intro || ''),
    tracks: Object.fromEntries((Array.isArray(res?.tracks) ? res.tracks : []).filter((t) => ids.has(String(t.id))).map((t) => [String(t.id), String(t.blurb || '')])),
    sns: (Array.isArray(res?.sns) ? res.sns : []).map(String).slice(0, 5),
    hashtags: String(res?.hashtags || ''),
  };
}
