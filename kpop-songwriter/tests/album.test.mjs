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

// 캘린더 파일(.ics): 끝낸 일정 빼기, 하루 종일(다음 날 끝, 달 넘김), 알림, 특수문자, 75바이트 접기
{
  const { scheduleIcs, fold } = await import('../src/js/album/ics.js');
  const al = { ...newAlbum(), id: 'alb1', title: '새벽, 신호; 테스트', releaseDate: '2026-11-30' };
  assert.equal(scheduleIcs({ ...al, releaseDate: '' }), null);
  al.schedule = { 'final-songs': true };
  const ics = scheduleIcs(al, { now: new Date(Date.UTC(2026, 9, 7, 1, 2, 3)) });
  const rows = ics.split('\r\n');
  assert.equal(rows[0], 'BEGIN:VCALENDAR');
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 11, '12단계 중 끝낸 1개 빼고');
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261130\r\nDTEND;VALUE=DATE:20261201'), '발매일 다음 날 끝 (달 넘김)');
  assert.ok(ics.includes('UID:alb1-release@kpop-songwriter'));
  assert.ok(ics.includes('DTSTAMP:20261007T010203Z'));
  assert.ok(ics.includes('TRIGGER:PT9H'));
  assert.ok(ics.replace(/\r\n /g, '').includes('SUMMARY:[새벽\\, 신호\; 테스트] 발매 (D+0)'), '쉼표·세미콜론 이스케이프');
  const enc = new TextEncoder();
  assert.ok(rows.every((r) => enc.encode(r).length <= 75), '모든 줄 75바이트 이하');
  assert.equal(fold('가'.repeat(30)).split('\r\n ').join(''), '가'.repeat(30), '접어도 글자가 안 깨짐');
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  console.log('ics OK');
}

// 트랙 순서 추천: 타이틀 1번, 잔잔한 곡 마지막, 짧은 인트로는 맨 앞, 이미 좋은 순서면 그대로
{
  const { suggestOrder, trackTraits } = await import('../src/js/album/order.js');
  const mkSong = (id, bpm, energy, root = 9, mode = 'minor') => {
    const s = normalizeMusic(exampleSong());
    s.id = id;
    s.music.bpm = bpm; s.music.root = root; s.music.mode = mode;
    Object.values(s.music.sections).forEach((sm) => { sm.energy = energy; });
    return s;
  };
  const songsO = [mkSong('ballad', 72, 1.5), mkSong('title', 124, 4.5), mkSong('b', 118, 4), mkSong('c', 100, 3, 2, 'major')];
  assert.ok(Math.abs(trackTraits(songsO[1]).energy - 4.5) < 1e-9);
  const tr = (ids, title) => ids.map((id) => ({ ...newTrack(id), isTitle: id === title }));
  const r = suggestOrder(tr(['ballad', 'b', 'title', 'c'], 'title'), songsO);
  assert.equal(r.order[0], 'title', '타이틀곡이 1번');
  assert.equal(r.order[3], 'ballad', '잔잔한 곡이 마지막');
  assert.ok(r.better && r.why.includes('타이틀곡이 1번'));
  const again = suggestOrder(tr(r.order, 'title'), songsO);
  assert.equal(again.better, false, '추천 순서를 다시 넣으면 그대로');
  // 짧은 인트로(90초 미만)는 타이틀 앞
  const intro = mkSong('intro', 90, 2);
  intro.sections = intro.sections.slice(0, 2);
  assert.ok(trackTraits(intro).seconds < 90);
  const r2 = suggestOrder(tr(['ballad', 'title', 'intro', 'b'], 'title'), [...songsO, intro]);
  assert.deepEqual(r2.order.slice(0, 2), ['intro', 'title']);
  assert.equal(suggestOrder(tr(['title'], 'title'), songsO).better, false);
  // 인트로가 가장 잔잔해도 끝으로 가지 않음
  const quietIntro = mkSong('qintro', 80, 1);
  quietIntro.sections = quietIntro.sections.slice(0, 2);
  const r3 = suggestOrder(tr(['title', 'ballad', 'b', 'qintro', 'c'], 'title'), [...songsO, quietIntro]);
  assert.deepEqual([r3.order[0], r3.order[1], r3.order[4]], ['qintro', 'title', 'ballad']);
  console.log('order OK');
}

// 가사집: 표지·트랙 목록·곡마다 한 쪽·크레딧, HTML 이스케이프, 커버 없으면 글자 표지
{
  const { bookletHtml } = await import('../src/js/album/booklet.js');
  const al = { ...newAlbum(), title: '<b>Midnight</b> & Co', artist: '물결', cLine: '2026 물결뮤직', pLine: '2026 물결뮤직',
    tracks: [{ ...newTrack(song.id), isTitle: true, lyricists: '물결', composers: '물결 "A"' }, newTrack('gone')] };
  const html = bookletHtml(al, [song], '');
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.includes('&lt;b&gt;Midnight&lt;/b&gt; &amp; Co') && !html.includes('<b>Midnight'), '제목 이스케이프');
  assert.equal((html.match(/class="page lyrics"/g) || []).length, 1, '지워진 곡은 빠짐');
  assert.ok(html.includes('작곡 물결 &quot;A&quot;'));
  assert.ok(html.includes('class="plain"'), '커버 없으면 글자 표지');
  assert.ok(html.includes('© 2026 물결뮤직'));
  assert.ok(bookletHtml(al, [song], 'data:image/jpeg;base64,AAAA').includes('<img src="data:image/jpeg;base64,AAAA"'));
  console.log('booklet OK');
}

// 지분: 이름 나누기, 똑같이 나누기(합 100), 직접 적은 비율, 합 경고·안 적음 참고, 시트 CSV
{
  const { names, equalShares, splitsFor, splitIssues, splitRows } = await import('../src/js/album/splits.js');
  assert.deepEqual(names('A, B & C·D / A and E'), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(equalShares(['a', 'b', 'c']).reduce((x, y) => x + y.share, 0).toFixed(2), '100.00');
  const t = { ...newTrack(song.id), lyricists: '물결, 하늘', composers: '물결', arrangers: '바다 & 하늘 & 별', splits: { lyric: { 물결: 60, 하늘: 30 } } };
  const sp = splitsFor(t);
  assert.deepEqual(sp[0].people, [{ name: '물결', share: 60 }, { name: '하늘', share: 30 }]);
  assert.equal(sp[0].sum, 90);
  assert.deepEqual(splitIssues(t).map((r) => r.name), ['작사']);
  assert.equal(sp[2].custom, false);
  assert.equal(sp[2].sum, 100, '안 적으면 똑같이 (합 100)');
  const al = { ...newAlbum(), title: 'X', artist: '물결', cLine: '2026 a', pLine: '2026 a', releaseDate: '2026-12-01', tracks: [{ ...t, isTitle: true }] };
  const items = releaseChecklist(al, [song], { masters: { [song.id]: { name: 'a.wav', sampleRate: 44100, bits: 24, format: 1, channels: 2, lufs: -14, peak: -1, duration: 200 } }, coverInfo: { width: 3000, height: 3000 }, today });
  assert.ok(items.some((i) => i.level === 'warn' && i.text.includes('작사 지분 합이 90%')));
  assert.ok(items.some((i) => i.level === 'info' && i.text.includes('편곡을 여럿이')));
  const rows = splitRows(al, [song]);
  assert.deepEqual(rows[0], ['Track', 'Title', 'Role', 'Name', 'Share %', 'Agreed']);
  assert.equal(rows.length, 1 + 2 + 1 + 3);
  assert.deepEqual(rows.find((r) => r[3] === '별'), [1, '새벽 신호', '편곡', '별', 33.34, 'equal (not set)']);
  console.log('splits OK');
}

// 발매 후 성과: 같은 날짜는 덮어씀·빈 값 무시, 늘어난 수·비중, 눈에 띄는 곡, 취향 기록으로
{
  const { addSnapshot, trackSummary, standout, learnFromRelease } = await import('../src/js/album/stats.js');
  const { emptyTaste, promptBlock, tasteStats } = await import('../src/js/learn/taste.js');
  const s2 = { ...normalizeMusic(exampleSong()), id: 'song-b', title: '둘째 곡' };
  const al = { ...newAlbum(), tracks: [{ ...newTrack(song.id), isTitle: true }, newTrack('song-b')] };
  assert.equal(addSnapshot(al, '2026-12-01', { [song.id]: '', 'song-b': '' }), false, '빈 값만이면 기록 안 함');
  addSnapshot(al, '2026-12-08', { [song.id]: '1000', 'song-b': '3000' });
  addSnapshot(al, '2026-12-01', { [song.id]: 400, 'song-b': ' ' });
  addSnapshot(al, '2026-12-08', { [song.id]: '1200', 'song-b': '3800' });
  assert.deepEqual(al.stats.map((d) => d.date), ['2026-12-01', '2026-12-08'], '날짜순, 같은 날짜는 하나');
  const rows = trackSummary(al, [song, s2]);
  assert.deepEqual(rows.map((r) => [r.latest, r.growth, r.share]), [[1200, 800, 24], [3800, null, 76]]);
  const best = standout(rows);
  assert.equal(best.songId, 'song-b');
  assert.equal(standout(rows.slice(0, 1)), null, '한 곡뿐이면 비교 안 함');
  const t = emptyTaste();
  learnFromRelease(t, al, s2);
  assert.deepEqual(t.log.map((e) => [e.kind, e.rating, e.context.source]), [['arrange', 1, 'release'], ['lyrics', 1, 'release']]);
  assert.deepEqual(tasteStats(t).bpmRange, [s2.music.bpm, s2.music.bpm], '편곡 BPM 통계에 들어감');
  assert.ok(promptBlock(t, 'lyrics').includes('좋아한 예시'), '코러스가 좋아한 가사 예시로 들어감');
  learnFromRelease(t, al, s2);
  assert.equal(t.log.length, 2, '같은 곡을 두 번 넣어도 하나씩');
  console.log('stats OK');
}
