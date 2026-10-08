// 앨범 발매 로직 점검: 일정표, 발매 전 점검표, 메타데이터 CSV, 파일 이름. 실행: npm run test:album
import assert from 'node:assert/strict';
import { newAlbum, newTrack, scheduleFor, releaseChecklist, metadataRows, albumRows, toCsv, trackFileName, daysUntil, fillCredits } from '../src/js/album/model.js';
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
  // 곡 끝을 잘랐으면 정리를 꺼도 끝에 짧은 페이드(딸깍 방지)
  const cutEnd = () => { const c = new Float32Array(n).fill(0.5); return c; };
  const raw = finishEdges([cutEnd()], rate, { trim: false, fadeOut: 0 }).channels[0];
  assert.equal(raw[n - 1], 0.5, '자르지 않았으면 그대로');
  const cut = finishEdges([cutEnd()], rate, { trim: false, fadeOut: 0, cut: true }).channels[0];
  assert.equal(cut.length, n);
  assert.ok(Math.abs(cut[n - 1]) < 0.02 && cut[n - 100] === 0.5, '끝 50ms 페이드');
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
  assert.ok(ics.replace(/\r\n /g, '').includes('SUMMARY:[새벽\\, 신호\\; 테스트] 발매 (D+0)'), '쉼표·세미콜론 이스케이프');
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
  const inst = { ...song, sections: song.sections.map((x) => ({ ...x, text: '' })) };
  assert.ok(bookletHtml(al, [inst], '').includes('(연주곡)'), '가사 없는 곡은 (연주곡)');
  console.log('booklet OK');
}

// 지분: 이름 나누기, 똑같이 나누기(합 100), 직접 적은 비율, 합 경고·안 적음 참고, 시트 CSV
{
  const { names, equalShares, splitsFor, splitIssues, splitRows } = await import('../src/js/album/splits.js');
  assert.deepEqual(names('A, B & C·D / A and E'), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(equalShares(['a', 'b', 'c']).reduce((x, y) => x + y.share, 0).toFixed(2), '100.00');
  const t = { ...newTrack(song.id), lyricists: '물결, 하늘', composers: '물결', arrangers: '바다 & 하늘 & 별', splits: { lyric: { 물결: 60, 하늘: 30 } } };
  const sp = splitsFor(t);
  assert.deepEqual(sp[0].people.map(({ name, share }) => ({ name, share })), [{ name: '물결', share: 60 }, { name: '하늘', share: 30 }]);
  // 지분을 적은 뒤 사람을 더하면: 새 사람 0%, 합이 100이어도 경고, 시트에 'not set'
  const added = { ...t, lyricists: '물결, 하늘, 별', splits: { lyric: { 물결: 60, 하늘: 40 } } };
  assert.deepEqual(splitsFor(added)[0].missing, ['별']);
  assert.equal(splitsFor(added)[0].sum, 100);
  assert.deepEqual(splitIssues(added).map((r) => r.name), ['작사'], '합이 100이어도 빠진 사람이 있으면 경고');
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
  const rowsAdded = splitRows({ ...al, tracks: [{ ...added, isTitle: true }] }, [song]);
  assert.deepEqual(rowsAdded.filter((r) => r[2] === '작사').map((r) => [r[3], r[5]]), [['물결', 'Y'], ['하늘', 'Y'], ['별', 'not set']]);
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
  addSnapshot(al, '2026-12-01', { 'song-b': '900' });
  assert.deepEqual(al.stats[0].plays, { [song.id]: 400, 'song-b': 900 }, '같은 날 다시 적으면 그 곡만 고침');
  al.stats[0].plays = { [song.id]: 400 };
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

// 커버 추천: 타이틀곡 분위기 먼저, 앞의 분위기에 무게, 모르는 분위기만이면 없음
{
  const { suggestCover, coverMoods } = await import('../src/js/album/coverpick.js');
  const { PALETTES } = await import('../src/js/album/cover.js');
  const sA = { id: 'a', concept: { moods: ['청량', '하이틴'] } };
  const sB = { id: 'b', concept: { moods: ['다크'] } };
  assert.deepEqual(coverMoods({ tracks: [{ songId: 'a' }, { songId: 'b', isTitle: true }] }, [sA, sB]), ['다크']);
  assert.deepEqual(coverMoods({ tracks: [{ songId: 'a' }, { songId: 'b' }] }, [sA, sB]), ['청량', '하이틴', '다크']);
  const sg = suggestCover(['청량', '하이틴']);
  assert.equal(PALETTES[sg.palette].name, '민트');
  assert.equal(sg.template, 'gradient');
  assert.equal(suggestCover(['없는분위기']), null);
  assert.equal(suggestCover([]), null);
  console.log('coverpick OK');
}

// 19금 점검: 욕설로 보이는 말 찾기(흔한 말 속은 제외), 표시가 꺼져 있으면 점검표 경고
{
  const { explicitWords } = await import('../src/js/album/explicit.js');
  assert.deepEqual(explicitWords('이게 시발점이야\nshitake? no — Dickens'), [], '시발점·다른 단어 속은 아님');
  assert.deepEqual(explicitWords('씨발 진짜\nWhat the FUCK, shit'), ['씨발', 'fuck', 'shit']);
  const rudeSong = { ...song, id: 'rude', title: '거친 곡', sections: [{ id: 'r1', type: 'Verse', members: [], text: '지랄 말고 들어' }] };
  const al = { ...newAlbum(), title: 'X', artist: 'Y', cLine: '2026 a', pLine: '2026 a', releaseDate: '2026-12-01', tracks: [{ ...newTrack('rude'), isTitle: true, lyricists: 'a', composers: 'a' }] };
  const warn = releaseChecklist(al, [rudeSong], { today }).find((i) => i.text.includes('19금'));
  assert.ok(warn && warn.level === 'warn' && warn.text.includes('지랄') && warn.go.tab === 'meta');
  al.tracks[0].explicit = true;
  assert.ok(!releaseChecklist(al, [rudeSong], { today }).some((i) => i.text.includes('19금')), '표시를 켜면 경고 없음');
  console.log('explicit OK');
}

// Inst. 트랙: 작사 크레딧·가사 없음은 점검 대상 아님
{
  const inst = { ...song, id: 'inst1', title: '새벽 신호 (Inst.)', instOf: song.id, sections: song.sections.map((x) => ({ ...x, text: '' })) };
  const al = { ...newAlbum(), title: 'X', artist: 'Y', cLine: '2026 a', pLine: '2026 a', releaseDate: '2026-12-01', tracks: [{ ...newTrack('inst1'), isTitle: true, composers: 'a' }] };
  const items = releaseChecklist(al, [inst], { today });
  assert.ok(!items.some((i) => i.text.includes('작사 크레딧') || i.text.includes('가사가 없어요')));
  console.log('inst OK');
}

// 빈 크레딧 채우기: Inst. 곡은 작사를 비워 두고, 이미 적은 칸은 그대로
{
  const vocal = { id: 'v1', sections: [] };
  const inst = { id: 'i1', instOf: 'v1', sections: [] };
  const al = { ...newAlbum(), tracks: [{ ...newTrack('v1'), composers: '다른 사람' }, newTrack('i1')] };
  fillCredits(al, [vocal, inst], '물결');
  assert.deepEqual([al.tracks[0].lyricists, al.tracks[0].composers, al.tracks[0].arrangers], ['물결', '다른 사람', '물결']);
  assert.deepEqual([al.tracks[1].lyricists, al.tracks[1].composers, al.tracks[1].arrangers], ['', '물결', '물결']);
  console.log('credits fill OK');
}

// 제목 표기 점검: 피처링·프로듀서·홍보 문구·이모지·빈칸. 흔한 단어 속·대문자 제목은 통과
import { titleIssues } from '../src/js/album/titlecheck.js';
{
  const has = (t, word) => titleIssues(t).some((x) => x.includes(word));
  assert.ok(has('Midnight (feat. JUN)', '피처링'));
  assert.ok(has('Midnight ft. JUN', '피처링'));
  assert.ok(has('Signal (Prod. by Wave)', '프로듀서'));
  assert.ok(has('Signal (Official Audio)', 'Official'));
  assert.ok(has('Signal (Explicit)', 'Official'));
  assert.ok(has('새벽 신호 (신곡)', 'Official'));
  assert.ok(has('Signal 🔥', '이모지'));
  assert.ok(has('Signal  Lost', '빈칸'));
  assert.ok(has(' Signal', '빈칸'));
  assert.ok(has('Love (Feat.pH-1)', '피처링'));
  assert.ok(has('Love (feat.Jay)', '피처링'));
  assert.ok(has('Love ft.이름', '피처링'));
  assert.ok(has('Seoul 🇰🇷', '이모지'));
  assert.ok(has('Track 1️⃣', '이모지'));
  assert.ok(has('새벽 신호 [19금]', 'Official'));
  for (const ok of ['LOVE DIVE', 'Left Behind', 'Left.', 'Product of Love', 'Clean Slate', 'Gift', 'Official Girl', '사랑의 공식', '연애공식', '당신곡', '새벽 신호 (Midnight Signal)', 'Featuring'.slice(0, 4) + 'ure', 'Signal © 2026', 'Midnight Signal (Inst.)']) {
    assert.deepEqual(titleIssues(ok), [], ok);
  }
  // 점검표에 앨범·트랙 제목 경고로 들어감
  const s3 = normalizeMusic(exampleSong());
  s3.title = 'Signal (feat. JUN)';
  const al3 = { ...newAlbum(), title: 'Album 🔥', artist: 'Y', releaseDate: '2026-12-01', tracks: [{ ...newTrack(s3.id), isTitle: true }] };
  const items = releaseChecklist(al3, [s3], { today });
  assert.ok(items.some((i) => i.level === 'warn' && i.text.startsWith('앨범 제목:') && i.go.tab === 'meta'));
  assert.ok(items.some((i) => i.level === 'warn' && i.text.includes('1번 「Signal (feat. JUN)」: 제목에 피처링') && i.go.tab === 'concept'));
  console.log('title check OK');
}

// 기본 제목: '제목 없는 곡'·빈 제목·'새 앨범'은 오류, '제목 없음'·'가져온 곡'은 경고. 앱이 붙인 꼬리표는 떼고 본다
import { placeholderTitle } from '../src/js/album/titlecheck.js';
{
  for (const t of ['', '  ', null, '제목 없는 곡', '새 앨범', '제목 없는 곡 (Inst.)', '제목 없는 곡 (사본) (Inst.)', '예시: 제목 없는 곡']) assert.equal(placeholderTitle(t), 'error', String(t));
  for (const t of ['제목 없음', '가져온 곡', '제목 없음 (백업)', '가져온 곡 (가져옴)']) assert.equal(placeholderTitle(t), 'warn', t);
  for (const t of ['Untitled', '새벽 신호', '새벽 신호 (Inst.)', '새벽 신호 (사본)', '제목 없는 곡들의 밤', '무제 (Untitled, 2014)']) assert.equal(placeholderTitle(t), null, t);
  const s4 = normalizeMusic(exampleSong());
  s4.title = '제목 없는 곡';
  const al4 = { ...album, title: '제목 없는 곡', tracks: [{ ...newTrack(s4.id), isTitle: true, lyricists: '물결', composers: '물결' }] };
  const m4 = { [s4.id]: { name: 'a.wav', sampleRate: 44100, bits: 24, lufs: -14, peak: -1, duration: 200 } };
  let items = releaseChecklist(al4, [s4], { masters: m4, coverInfo: { width: 3000, height: 3000 }, today });
  assert.ok(items.some((i) => i.level === 'error' && i.text === '앨범 제목을 정해 주세요.' && i.go.tab === 'meta'));
  const trackErr = items.find((i) => i.level === 'error' && i.text.includes('1번 곡 제목을 정해 주세요'));
  assert.deepEqual(trackErr.go, { song: s4.id, tab: 'concept' });
  s4.title = '';
  items = releaseChecklist({ ...al4, title: 'Midnight' }, [s4], { masters: m4, coverInfo: { width: 3000, height: 3000 }, today });
  assert.ok(items.some((i) => i.level === 'error' && i.text.includes('빈 제목')));
  assert.ok(!items.some((i) => i.text === '앨범 제목을 정해 주세요.'));
  s4.title = '제목 없음';
  items = releaseChecklist({ ...al4, title: 'Midnight' }, [s4], { masters: m4, coverInfo: { width: 3000, height: 3000 }, today });
  assert.ok(!items.some((i) => i.level === 'error' && i.go?.tab === 'concept'), '제목 없음은 오류가 아님');
  assert.ok(items.some((i) => i.level === 'warn' && i.text.includes('기본 제목')));
  assert.equal(trackFileName(0, '   '), '01 Untitled.wav');
  assert.equal(trackFileName(0, '예시: 새벽 신호'), '01 새벽 신호.wav');
  console.log('placeholder title OK');
}

// 곡 사이 넘어가는 부분: 앞뒤 자르기, 이어 붙이기(모노는 양쪽), 이웃 쌍과 음량 차이
import { edgesOf, joinClips, transitionPairs } from '../src/js/album/transition.js';
{
  const rate = 10;
  const ramp = Float32Array.from({ length: 100 }, (_, i) => i);
  const e = edgesOf([ramp, ramp], rate, 3);
  assert.deepEqual([...e.head[0]], [...Array(30).keys()]);
  assert.equal(e.tail[1][0], 70);
  assert.equal(edgesOf([ramp.slice(0, 5)], rate, 3).head[0].length, 5, '짧은 곡은 있는 만큼');
  const j = joinClips([Float32Array.of(1, 2)], [Float32Array.of(3), Float32Array.of(4)], rate, 0.2);
  assert.deepEqual([...j[0]], [1, 2, 0, 0, 3]);
  assert.deepEqual([...j[1]], [1, 2, 0, 0, 4], '모노 앞 곡은 오른쪽에도');
  const tracks = [{ songId: 'a' }, { songId: 'b' }, { songId: 'c' }];
  const file = {};
  const pairs = transitionPairs(tracks, { a: { file, lufs: -14 }, b: { file, lufs: -9.5 } });
  assert.equal(pairs.length, 2);
  assert.deepEqual([pairs[0].ready, pairs[0].gap, pairs[1].ready, pairs[1].gap], [true, 4.5, false, null]);
  console.log('transition OK');
}

// 가사 카드 글자 배치: 빈칸에서 나누고, 빈칸 없는 긴 말은 글자 단위로, 상자에 들어가는 가장 큰 크기
import { wrapLine, layoutLyrics } from '../src/js/album/lyriccard.js';
{
  const m = (t) => t.length * 10; // 글자당 10px
  assert.deepEqual(wrapLine(m, '새벽 세 시 빛이 번져', 60), ['새벽 세 시', '빛이 번져']);
  assert.deepEqual(wrapLine(m, '가나다라마바사아자차', 40), ['가나다라', '마바사아', '자차']);
  assert.deepEqual(wrapLine(m, '짧은 줄', 1000), ['짧은 줄']);
  const at = (size, t) => t.length * size * 0.5;
  const big = layoutLyrics(at, ['짧은 한 줄'], 800, 600);
  assert.equal(big.size, 76, '짧으면 가장 큰 글씨');
  const many = layoutLyrics(at, Array(4).fill('Midnight signal 너를 불러 새벽 세 시 빛이 번져'), 860, 830);
  assert.ok(many.size < 76 && many.rows.length * many.size * 1.5 <= 830, `줄여서 들어감 ${many.size}`);
  console.log('lyric card layout OK');
}

// 새 앨범이 지난 앨범의 아티스트 정보를 이어받음 (©/℗ 연도는 올해로), 앨범마다 다른 것은 안 받음
import { inheritAlbumInfo } from '../src/js/album/model.js';
{
  const prev = { ...newAlbum(), title: '첫 앨범', artist: '물결', label: '물결뮤직', genre: 'Ballad', subgenre: '', language: '한국어·영어', cLine: '2025 물결뮤직', pLine: '물결', upc: '123456789012', releaseDate: '2025-05-01', ai: { lyrics: false, composition: true, vocals: true, note: '보컬만 Suno' } };
  const a = inheritAlbumInfo(newAlbum(), prev, 2026);
  assert.deepEqual([a.artist, a.label, a.genre, a.subgenre, a.language], ['물결', '물결뮤직', 'Ballad', '', '한국어·영어']);
  assert.equal(a.cLine, '2026 물결뮤직');
  assert.equal(a.pLine, '2026 물결', '연도가 없던 표기에도 올해를 붙임');
  assert.deepEqual(a.ai, { lyrics: false, composition: true, vocals: true, note: '보컬만 Suno' });
  assert.equal(a.title, '새 앨범');
  assert.equal(a.upc, '');
  assert.notEqual(a.releaseDate, '2025-05-01');
  assert.equal(inheritAlbumInfo(newAlbum(), { ...newAlbum(), cLine: '2025 ' }, 2026).cLine.trim(), String(new Date().getFullYear()), '비어 있던 표기는 기본값');
  assert.equal(inheritAlbumInfo(newAlbum(), null).artist, '', '첫 앨범은 그대로');
  // 기호·연도·범위·끝 연도가 붙은 표기도 "올해 이름"으로 (두 번 들어가지 않게)
  for (const [line, want] of [['℗ 2025 물결뮤직', '2026 물결뮤직'], ['(c) 2024 물결', '2026 물결'], ['© 2025 X', '2026 X'], ['물결뮤직 2025', '2026 물결뮤직'], ['2023-2025 물결', '2026 물결'], ['(P) 2025, 물결', '2026 물결'], ['Studio 1984', '2026 Studio 1984'], ['℗ 2025', '2026 '],
    ['© ℗ 2025 물결뮤직', '2026 물결뮤직'], ['2023~2025 물결뮤직', '2026 물결뮤직'], ['℗ 2025 스튜디오2020', '2026 스튜디오2020'], ['℗ 2025 Room 2019', '2026 Room 2019'], ['1004 Music', '2026 1004 Music'], ['(주)물결', '2026 (주)물결']]) {
    assert.equal(inheritAlbumInfo(newAlbum(), { ...newAlbum(), pLine: line }, 2026).pLine.replace(/\d{4} $/, '2026 '), want, line);
  }
  console.log('album inherit OK');
}

// 트랙리스트: 한 줄에 안 들어가는 제목은 줄임표
import { fitOne } from '../src/js/album/tracklistcard.js';
{
  const m = (t) => t.length * 10;
  assert.equal(fitOne(m, '짧은 제목', 200), '짧은 제목');
  assert.equal(fitOne(m, '아주 아주 긴 곡 제목입니다', 80), '아주 아주 긴…');
  assert.ok(m(fitOne(m, 'x'.repeat(50), 100)) <= 100);
  console.log('tracklist fit OK');
}

// AI를 못 쓰는 화면(웹)에서는 "유사 표현 점검을 아직 안 했어요" 안내를 빼고, 걸린 줄 경고는 그대로
{
  const s4 = normalizeMusic(exampleSong());
  const al4 = { ...newAlbum(), title: 'X', artist: 'Y', releaseDate: '2026-12-01', tracks: [{ ...newTrack(s4.id), isTitle: true }] };
  assert.ok(releaseChecklist(al4, [s4], { today }).some((i) => i.text.includes('유사 표현 점검을 아직')));
  assert.ok(!releaseChecklist(al4, [s4], { today, aiChecks: false }).some((i) => i.text.includes('유사 표현 점검을 아직')));
  console.log('ai checks option OK');
}

// 가사·음원 일치 확인: 줄 표시(맞음→다름→지움), 모두 맞음, 가사가 바뀌면 다시, 점검표 경고·안내
import { lyricCheckStatus, cycleLine, markAll } from '../src/js/album/lyriccheck.js';
{
  const s5 = normalizeMusic(exampleSong());
  assert.equal(lyricCheckStatus(s5), 'none');
  cycleLine(s5, 0);
  assert.equal(lyricCheckStatus(s5), 'partial');
  cycleLine(s5, 0);
  assert.equal(lyricCheckStatus(s5), 'off');
  cycleLine(s5, 0);
  assert.equal(lyricCheckStatus(s5), 'none');
  markAll(s5);
  assert.equal(lyricCheckStatus(s5), 'done');
  s5.sections[1].text += '\n새 줄';
  assert.equal(lyricCheckStatus(s5), 'stale');
  cycleLine(s5, 2);
  assert.deepEqual(s5.lyricCheck.ok, [2], '가사가 바뀌었으면 처음부터');
  const al5 = { ...newAlbum(), title: 'X', artist: 'Y', releaseDate: '2026-12-01', tracks: [{ ...newTrack(s5.id), isTitle: true }] };
  const master = { [s5.id]: { name: 'a.wav', sampleRate: 44100, bits: 24, format: 1, channels: 2, lufs: -14, peak: -1, duration: 100 } };
  assert.ok(releaseChecklist(al5, [s5], { today, masters: master }).some((i) => i.level === 'info' && i.text.includes('끝까지 확인하지 않았어요') && i.go.tab === 'master'));
  assert.ok(!releaseChecklist(al5, [s5], { today }).some((i) => i.text.includes('음원과 맞는지')), '마스터가 없으면 안내 안 함');
  cycleLine(s5, 2); // 다름
  assert.ok(releaseChecklist(al5, [s5], { today }).some((i) => i.level === 'warn' && i.text.includes('다르게 부른 가사 줄')));
  markAll(s5);
  assert.ok(!releaseChecklist(al5, [s5], { today, masters: master }).some((i) => i.text.includes('음원과 맞는지') || i.text.includes('다르게 부른')));
  console.log('lyric check OK');
}
