// 발매 진행 단계 판단 점검. 실행: npm run test:workflow
import assert from 'node:assert/strict';
import { songProgress } from '../src/js/workflow/progress.js';
import { exampleSong } from '../src/js/example.js';
import { normalizeMusic } from '../src/js/music/arrangement.js';
import { newAlbum, newTrack } from '../src/js/album/model.js';
import { mastersOf } from '../src/js/album/session.js';

const song = normalizeMusic(exampleSong());
song.example = false;
let pr = songProgress(song, { albums: [], songs: [song] });
const st = (id) => pr.steps.find((s) => s.id === id);
assert.equal(st('concept').done, true);
assert.equal(st('melody').done, true, '예시 곡은 코러스 멜로디가 있음');
assert.equal(st('arrange').done, false);
assert.equal(st('lyrics').done, true, '예시 곡 가사 점수 78점');
assert.equal(pr.next.id, 'arrange');

// 빈 섹션이 있으면 가사 미완료 + 개수 안내
song.sections.find((s) => s.type === 'Bridge').text = '';
pr = songProgress(song, { albums: [], songs: [song] });
assert.ok(st('lyrics').hint.includes('1개 섹션이 비어'));

// 플래그·앨범이 채워지면 단계가 넘어간다
song.progress = { arranged: true, suno: true };
song.sections.forEach((s) => { if (!['Intro', 'Outro', 'Dance Break'].includes(s.type)) s.text = '새벽 거리 위 너를 불러\n멈춘 시계 앞 너를 불러\nsignal on 다시 불러\n이 밤 끝에 너를 불러'; });
pr = songProgress(song, { albums: [], songs: [song] });
assert.equal(st('lyrics').done, true);
assert.equal(pr.next.id, 'master');
const album = newAlbum();
album.tracks.push(newTrack(song.id));
mastersOf(album.id)[song.id] = { name: 'x.wav', sampleRate: 44100, bits: 24, lufs: -14, peak: -1 };
pr = songProgress(song, { albums: [album], songs: [song] });
assert.equal(st('master').done, true);
assert.equal(pr.next.id, 'release');
assert.ok(st('release').hint.includes('꼭 고칠 것'));
console.log('workflow OK');

// 컨셉 아이디어: 제목·주제 없는 것 버림, 분위기는 목록 안의 것만, 키워드 배열 → 문자열, 최대 3개
{
  const { parseConcepts } = await import('../src/js/ai-concept.js');
  const out = parseConcepts({ concepts: [
    { title: '여름 신호', theme: '마지막 여름밤', story: 's', moods: ['청량', '없는분위기', '감성'], keywords: ['불꽃', '바다'], hook: 'Summer signal' },
    { title: '', theme: '제목 없음' },
    { title: 'B', theme: 'b', keywords: 'x, y' },
    { title: 'C', theme: 'c' },
    { title: 'D', theme: 'd' },
  ] });
  assert.equal(out.length, 3);
  assert.deepEqual(out[0].moods, ['청량', '감성']);
  assert.equal(out[0].keywords, '불꽃, 바다');
  assert.equal(out[1].keywords, 'x, y');
  assert.throws(() => parseConcepts({ concepts: [{ title: 'x' }] }), (e) => e.code === 'invalid_json');
  console.log('ideas OK');
}


// 앨범 진행 단계: 빈 앨범 → 수록곡부터, 다 채우면 제출 패키지, 받으면 발매 후 기록, 기록하면 모두 완료
{
  const { albumProgress } = await import('../src/js/workflow/album-progress.js');
  const { newAlbum, newTrack } = await import('../src/js/album/model.js');
  const { exampleSong } = await import('../src/js/example.js');
  const { normalizeMusic } = await import('../src/js/music/arrangement.js');
  const song = normalizeMusic(exampleSong());
  const today = new Date(2026, 9, 7);
  const al = { ...newAlbum(), title: '새 앨범', artist: '', releaseDate: '2026-12-01' };
  let p = albumProgress(al, [song], { today });
  assert.equal(p.next.id, 'tracks');
  al.title = 'Midnight Signal'; al.artist = '물결'; al.cLine = '2026 물결'; al.pLine = '2026 물결';
  al.tracks = [{ ...newTrack(song.id), isTitle: true, lyricists: '물결', composers: '물결', arrangers: '물결' }];
  p = albumProgress(al, [song], { today });
  assert.equal(p.next.id, 'tracks', '마스터가 없으면 아직 수록곡 단계');
  const masters = { [song.id]: { name: 'a.wav', sampleRate: 44100, bits: 24, format: 1, channels: 2, lufs: -14, peak: -1, duration: 200 } };
  p = albumProgress(al, [song], { masters, today });
  assert.equal(p.next.id, 'cover');
  p = albumProgress(al, [song], { masters, coverInfo: { width: 3000, height: 3000 }, today });
  assert.equal(p.next.id, 'package', '점검 통과 → 제출 패키지');
  const { packageKey } = await import('../src/js/workflow/album-progress.js');
  const opts = { masters, coverInfo: { width: 3000, height: 3000 } };
  al.submittedAt = Date.now();
  al.submittedKey = packageKey(al, opts);
  p = albumProgress(al, [song], { ...opts, today });
  assert.equal(p.next.id, 'after');
  al.tracks[0].composers = '물결, 하늘';
  p = albumProgress(al, [song], { ...opts, today });
  assert.equal(p.next.id, 'package', '받은 뒤 크레딧이 바뀌면 다시 받기');
  assert.ok(p.next.hint.includes('다시 받아'));
  al.tracks[0].composers = '물결';
  p = albumProgress(al, [song], { ...opts, today });
  assert.equal(p.next.id, 'after', '되돌리면 다시 완료');
  assert.ok(p.next.hint.includes('D-55'));
  al.stats = [{ date: '2026-12-08', plays: { [song.id]: 10 } }];
  assert.equal(albumProgress(al, [song], { masters, coverInfo: { width: 3000, height: 3000 }, today }).next, null);
  console.log('album progress OK');
}

// 곡 목록 진행 단계 수(캐시)가 마스터·커버·다른 트랙·취향 기록이 바뀌면 다시 계산됨 — 늘 songProgress와 같아야 함
import { progressCount } from '../src/js/workflow/progress.js';
import { setMaster, setCover } from '../src/js/album/session.js';
{
  // (Node의 URL.createObjectURL은 진짜 Blob만 받으므로 커버에 Blob을 넣는다)
  const a = normalizeMusic(exampleSong());
  const b = normalizeMusic(exampleSong());
  a.concept.theme = 'A'; b.concept.theme = 'B';
  a.progress = { arranged: true, suno: true }; b.progress = { arranged: true, suno: true };
  const al = { ...newAlbum(), title: 'Two', artist: 'Y', cLine: '2026 Y', pLine: '2026 Y', releaseDate: '2026-12-20', tracks: [{ ...newTrack(a.id), isTitle: true, lyricists: 'Y', composers: 'Y' }, { ...newTrack(b.id), lyricists: 'Y', composers: 'Y' }] };
  const ctx = { albums: [al], songs: [a, b], taste: { log: [] } };
  const truth = () => songProgress(a, ctx).steps.filter((s) => s.done).length;
  const wav = { file: {}, name: 'a.wav', sampleRate: 44100, bits: 24, format: 1, channels: 2, lufs: -14, peak: -1, duration: 100 };
  setMaster(al.id, a.id, wav);
  assert.equal(progressCount(a, ctx), truth());
  setMaster(al.id, b.id, wav); // 다른 트랙 마스터
  assert.equal(progressCount(a, ctx), truth());
  setCover(al.id, { blob: new Blob(['x']), width: 3000, height: 3000, source: 'template' });
  assert.equal(progressCount(a, ctx), truth());
  b.updatedAt += 1; b.sections.forEach((s) => { s.text = ''; }); // 다른 트랙 가사가 비면 점검표 결과가 바뀔 수 있음
  assert.equal(progressCount(a, ctx), truth());
  ctx.taste.log.push({ id: 'x', at: 1, kind: 'lyrics', rating: 1, text: '가 나 다', reasons: [], context: {} });
  assert.equal(progressCount(a, ctx), truth());
  console.log('progress count cache OK');
}
