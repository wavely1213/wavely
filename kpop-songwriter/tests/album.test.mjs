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
