// 앨범 발매 로직 점검: 일정표, 발매 전 점검표, 메타데이터 CSV, 파일 이름. 실행: npm run test:album
import assert from 'node:assert/strict';
import { newAlbum, newTrack, scheduleFor, releaseChecklist, metadataRows, albumRows, toCsv, trackFileName, daysUntil } from '../src/js/album/model.js';
import { plainLyrics } from '../src/js/album/release.js';
import { exampleSong } from '../src/js/example.js';
import { normalizeMusic } from '../src/js/music/arrangement.js';

const today = new Date(2026, 9, 7); // 2026-10-07
const song = normalizeMusic(exampleSong());
song.title = '새벽 신호';
const album = newAlbum();
album.releaseDate = '2026-11-20';

// 일정표: 발매일 기준 날짜, 남은 날, 지난 항목 표시
const sch = scheduleFor(album, today);
assert.equal(sch.find((s) => s.id === 'release').date, '2026-11-20');
assert.equal(sch.find((s) => s.id === 'distributor').date, '2026-10-23'); // D-28
assert.equal(sch.find((s) => s.id === 'final-songs').left, 2); // 10-09
album.releaseDate = '2026-10-20';
assert.equal(scheduleFor(album, today).find((s) => s.id === 'final-songs').overdue, true);
assert.equal(daysUntil('2026-10-20', today), 13);

// 점검표: 빈 앨범은 제목·아티스트·곡·커버 오류
let check = releaseChecklist(album, [song], { today });
const errs = (c) => c.filter((i) => i.level === 'error').map((i) => i.text);
assert.ok(errs(check).some((t) => t.includes('앨범 제목')));
assert.ok(errs(check).some((t) => t.includes('아티스트명')));
assert.ok(errs(check).some((t) => t.includes('수록곡')));
assert.ok(errs(check).some((t) => t.includes('커버')));
assert.ok(check.some((i) => i.level === 'warn' && i.text.includes('13일')));

// 채운 앨범: 마스터·크레딧·커버 갖추면 오류 없음
album.title = 'Midnight Signal';
album.artist = '물결';
album.releaseDate = '2026-12-01';
album.cLine = '2026 물결뮤직';
album.pLine = '2026 물결뮤직';
album.tracks = [{ ...newTrack(song.id), isTitle: true, lyricists: '물결', composers: '물결', arrangers: '물결' }];
const masters = { [song.id]: { name: 'a.wav', sampleRate: 44100, bits: 24, lufs: -14, peak: -1, duration: 200 } };
check = releaseChecklist(album, [song], { masters, coverInfo: { width: 3000, height: 3000 }, today });
assert.deepEqual(errs(check), []);
// 싱크 가사: 맞춘 뒤 가사가 바뀌면 경고(싱크 탭으로), 마스터 길이가 다르면 경고
const { makeSync } = await import('../src/js/album/lrc.js');
song.sync = makeSync(song, Array.from({ length: 200 }, (_, k) => k), { duration: 200 });
assert.ok(!releaseChecklist(album, [song], { masters, coverInfo: { width: 3000, height: 3000 }, today }).some((i) => i.text.includes('싱크')), '맞춘 싱크는 경고 없음');
const longer = { [song.id]: { ...masters[song.id], duration: 215 } };
assert.ok(releaseChecklist(album, [song], { masters: longer, coverInfo: { width: 3000, height: 3000 }, today }).some((i) => i.text.includes('길이가 달라요') && i.go.tab === 'sync'));
song.sync = { ...song.sync, key: 'old lyrics' };
const stale = releaseChecklist(album, [song], { masters, coverInfo: { width: 3000, height: 3000 }, today }).find((i) => i.text.includes('싱크 가사를 맞춘 뒤'));
assert.ok(stale && stale.level === 'warn' && stale.go.tab === 'sync');
delete song.sync;
// 트랙 간 음량 차이: 3 LU 넘으면 작은 곡 마스터링 탭으로 안내
const song2 = { ...normalizeMusic(exampleSong()), id: 'song-2', title: '두 번째' };
const two = { ...album, tracks: [...album.tracks, { ...newTrack('song-2'), lyricists: '물결', composers: '물결' }] };
const gapMasters = { ...masters, 'song-2': { ...masters[song.id], lufs: -18.5 } };
let gapWarn = releaseChecklist(two, [song, song2], { masters: gapMasters, coverInfo: { width: 3000, height: 3000 }, today }).find((i) => i.text.includes('음량 차이'));
assert.ok(gapWarn && gapWarn.level === 'warn' && gapWarn.text.includes('4.5 LU') && gapWarn.text.includes('2번 「두 번째」'));
assert.deepEqual(gapWarn.go, { song: 'song-2', tab: 'master' });
gapMasters['song-2'].lufs = -15.5;
gapWarn = releaseChecklist(two, [song, song2], { masters: gapMasters, coverInfo: { width: 3000, height: 3000 }, today }).find((i) => i.text.includes('음량 차이'));
assert.equal(gapWarn, undefined, '1.5 LU 차이는 괜찮음');
// 나쁜 마스터: mp3, 22kHz, 피크 0 → 오류·경고
check = releaseChecklist(album, [song], { masters: { [song.id]: { name: 'a.mp3', sampleRate: 22050, bits: null, lufs: -5, peak: 0.2 } }, coverInfo: { width: 1000, height: 800 }, today });
assert.ok(errs(check).some((t) => t.includes('WAV')));
assert.ok(errs(check).some((t) => t.includes('22050')));
assert.ok(errs(check).some((t) => t.includes('정사각형')));
assert.ok(check.some((i) => i.level === 'warn' && i.text.includes('트루 피크')));

// CSV: BOM, 쉼표·따옴표 이스케이프, 트랙 행
album.tracks[0].featuring = 'A, "B"';
const csv = toCsv(metadataRows(album, [song], masters));
assert.ok(csv.startsWith('﻿Disc,Track,Title'));
assert.ok(csv.includes('"A, ""B"""'));
assert.ok(csv.includes('01 새벽 신호.wav'));
assert.ok(toCsv(albumRows(album)).includes('AI Generated'));
assert.equal(trackFileName(9, '예시: a/b?'), '10 ab.wav');

// 가사지: 태그 없음, 비운 Chorus 2는 Chorus 1 가사로
const lyr = plainLyrics(song);
assert.ok(!lyr.includes('['));
assert.equal(lyr.split('Midnight signal 너를 불러').length - 1, 2);
console.log('album OK');

// 마스터링 앞뒤 정리: 앞 1초·뒤 2초 무음이 정리되고, 페이드 아웃 끝은 0에 가깝다
import { finishEdges } from '../src/js/music/master.js';
{
  const rate = 1000;
  const n = 5000;
  const make = () => { const c = new Float32Array(n); for (let i = 1000; i < 3000; i++) c[i] = 0.5; return c; };
  const res = finishEdges([make(), make()], rate, { trim: true, fadeOut: 0.5 });
  assert.ok(Math.abs(res.trimmedStart - 0.95) < 0.01, `앞 ${res.trimmedStart}`);
  assert.ok(Math.abs(res.trimmedEnd - 1.501) < 0.01, `뒤 ${res.trimmedEnd}`);
  const c = res.channels[0];
  assert.equal(c.length, 2549); // 950 ~ 3499
  assert.ok(Math.abs(c[c.length - 1]) < 0.01, '페이드 끝');
  assert.equal(c[0], 0, '페이드 인 시작');
  const none = finishEdges([make()], rate, { trim: false, fadeOut: 0 });
  assert.equal(none.channels[0].length, n, '끄면 길이 그대로');
  console.log('master edges OK');
}

// 마스터 파일 규격: float·모노·무음·형식 모름
{
  const base = { name: 'a.wav', sampleRate: 48000, bits: 32, format: 3, channels: 1, lufs: -Infinity, peak: -3 };
  const al = { ...newAlbum(), title: 'X', artist: 'Y', releaseDate: '2026-12-31', cLine: '2026 Y', pLine: '2026 Y' };
  al.tracks = [{ ...newTrack(song.id), lyricists: 'a', composers: 'a' }];
  const c = releaseChecklist(al, [song], { masters: { [song.id]: base }, coverInfo: { width: 3000, height: 3000 }, today });
  const t = c.map((i) => `${i.level}:${i.text}`).join('\n');
  assert.ok(/error:.*float/.test(t), 'float 오류');
  assert.ok(/warn:.*모노/.test(t), '모노 경고');
  assert.ok(/error:.*소리가 거의 없는/.test(t), '무음 오류');
  const unknown = releaseChecklist(al, [song], { masters: { [song.id]: { ...base, format: null, channels: 2, lufs: -14, bits: 24 } }, coverInfo: { width: 3000, height: 3000 }, today });
  assert.ok(unknown.some((i) => i.text.includes('형식 정보를 읽지 못했어요')));
  console.log('master checks OK');
}

// WAV 헤더 읽기: 24비트 PCM, float(3), 앞에 큰 LIST 덩어리(4KB 넘음)가 있는 파일
import { wavHeader } from '../src/js/album/release.js';
import { encodeWav } from '../src/js/music/pack.js';
{
  const ch = [new Float32Array(100), new Float32Array(100)];
  const pcm24 = encodeWav({ channels: ch, sampleRate: 48000 }, { bits: 24, normalize: false });
  assert.deepEqual(wavHeader(pcm24), { format: 1, sampleRate: 48000, bits: 24, channels: 2 });
  // fmt 앞에 8KB LIST 덩어리를 끼운 파일
  const list = new Uint8Array(8 + 8192);
  list.set([76, 73, 83, 84]); new DataView(list.buffer).setUint32(4, 8192, true);
  const withList = new Uint8Array(pcm24.length + list.length);
  withList.set(pcm24.subarray(0, 12)); withList.set(list, 12); withList.set(pcm24.subarray(12), 12 + list.length);
  assert.equal(wavHeader(withList)?.bits, 24, '4KB 넘는 앞 덩어리 뒤의 fmt도 읽음');
  const float = pcm24.slice(); new DataView(float.buffer).setUint16(20, 3, true);
  assert.equal(wavHeader(float).format, 3);
  assert.equal(wavHeader(new Uint8Array([1, 2, 3])), null);
  console.log('wav header OK');
}

// 커버 글자 불일치, ISRC·UPC 형식, 앨범 Explicit, 확장자, 고치러 갈 곳
import { extOf } from '../src/js/album/model.js';
{
  const al = { ...newAlbum(), title: 'Real Title', artist: '물결', releaseDate: '2026-12-31', cLine: '2026 Y', pLine: '2026 Y', upc: '12345' };
  al.tracks = [{ ...newTrack(song.id), lyricists: 'a', composers: 'a', isrc: 'KR-A01-26-0001', explicit: true }];
  const c = releaseChecklist(al, [song], { masters: {}, coverInfo: { width: 3000, height: 3000, drawnWith: { title: '새 앨범', artist: '' } }, today });
  assert.ok(c.some((i) => i.text.includes('커버 글자') && i.go.tab === 'cover'));
  assert.ok(c.some((i) => i.text.includes('ISRC 형식')));
  assert.ok(c.some((i) => i.text.includes('UPC')));
  assert.ok(c.filter((i) => i.level !== 'info').every((i) => i.go), '모든 항목에 고치러 갈 곳');
  al.tracks[0].isrc = 'KR-A01-26-00001';
  al.upc = '880000000001';
  const c2 = releaseChecklist(al, [song], { masters: {}, coverInfo: { width: 3000, height: 3000, drawnWith: { title: 'Real Title', artist: '물결' } }, today });
  assert.ok(!c2.some((i) => /ISRC|UPC|커버 글자/.test(i.text)), '올바르면 경고 없음');
  assert.ok(toCsv(albumRows(al)).includes('Explicit,Y'), '트랙이 19금이면 앨범도 Y');
  assert.equal(extOf('a.FLAC'), 'flac');
  assert.equal(extOf('noext'), 'wav');
  const noLyrics = releaseChecklist({ ...al, tracks: [{ ...newTrack(song.id), lyricists: 'a', composers: 'a' }] }, [{ ...song, sections: [{ id: 'x', type: 'Verse', members: [], text: '' }] }], { today });
  assert.deepEqual(noLyrics.find((i) => i.text.includes('가사가 없어요')).go, { song: song.id, tab: 'editor' });
  console.log('release checks OK');
}
