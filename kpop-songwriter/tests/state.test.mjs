// 상태 점검: 느린 작업 중 곡을 바꿔도 원래 곡에만 반영되는지, 저장 하나가 실패해도 나머지는 저장되는지,
// 취향을 못 불러왔을 때 덮어쓰지 않는지, 예시 곡을 앨범에 넣으면 저장되는지. 실행: npm run test:state
import assert from 'node:assert/strict';
import * as S from '../src/js/state.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function fakeStore({ failSave = () => false, tasteFails = false } = {}) {
  const saved = {};
  const versions = {};
  return {
    kind: 'local',
    saved,
    async list() { return []; },
    async save(song) { await wait(5); if (failSave(song.id)) throw new Error('full'); saved[song.id] = JSON.parse(JSON.stringify(song)); },
    async remove() {},
    async putVersion(songId, v) { versions[`${songId}/${v.id}`] = JSON.parse(JSON.stringify(v)); },
    async getVersion(songId, vid) { await wait(200); return versions[`${songId}/${vid}`] || null; }, // 느린 불러오기
    async removeVersion() {},
    async listAlbums() { return []; },
    async saveAlbum(a) { saved[a.id] = a; },
    async removeAlbum() {},
    async loadTaste() { if (tasteFails) throw new Error('down'); return null; },
    async saveTaste(t) { saved.taste = t; },
  };
}

// 1) 버전 복원 중 다른 곡으로 바꿔도 원래 곡만 복원된다
let store = fakeStore();
await S.init(store);
S.newSong();
const A = S.current();
S.mutate((s) => { s.title = 'A-원래'; });
assert.equal(await S.saveVersion('A v1'), true);
S.mutate((s) => { s.title = 'A-고침'; });
S.newSong();
const B = S.current();
S.mutate((s) => { s.title = 'B'; });
S.selectSong(A.id);
const restoring = S.restoreVersion(A.versions.find((v) => v.note === 'A v1').id);
S.selectSong(B.id); // 불러오는 사이 다른 곡으로
assert.equal(await restoring, true);
assert.equal(S.getState().songs.find((s) => s.id === A.id).title, 'A-원래', 'A가 복원됨');
assert.equal(S.getState().songs.find((s) => s.id === B.id).title, 'B', 'B는 그대로');

// 2) mutateSong은 열려 있는 곡과 상관없이 그 곡만 고친다
S.mutateSong(A.id, (s) => { s.music.bpm = 99; });
assert.equal(S.current().id, B.id);
assert.equal(S.getState().songs.find((s) => s.id === A.id).music.bpm, 99);
assert.notEqual(S.current().music.bpm, 99);

// 3) 저장 하나가 실패해도 나머지는 저장되고, 상태는 "실패"
store = fakeStore({ failSave: (id) => id === 'bad' });
await S.init(store);
S.newSong();
const ok1 = S.current().id;
S.getState().songs.unshift({ ...JSON.parse(JSON.stringify(S.current())), id: 'bad' });
S.mutateSong('bad', (s) => { s.title = 'bad'; });
S.mutateSong(ok1, (s) => { s.title = 'good'; });
await wait(1400);
assert.equal(store.saved[ok1]?.title, 'good', '실패한 곡 뒤의 곡도 저장');
assert.equal(S.getState().saveStatus, 'error');

// 4) 취향을 못 불러왔으면 저장하지 않는다 (기존 기록 보호)
store = fakeStore({ tasteFails: true });
await S.init(store);
S.mutateTaste((t) => { t.profile.lyrics = '새 값'; });
await wait(1400);
assert.equal(store.saved.taste, undefined, '불러오기 실패한 취향은 덮어쓰지 않음');

// 5) 예시 곡으로 싱글 앨범을 만들면 그 곡이 저장된다
store = fakeStore();
await S.init(store);
const ex = S.current();
assert.equal(ex.example, true);
S.newAlbum({ fromSong: ex });
await wait(1400);
assert.equal(ex.example, false);
assert.ok(store.saved[ex.id], '예시 곡이 저장됨');
// 6) 곡을 지우면 앨범 트랙·버전 사본도 정리된다
store = fakeStore();
const removedVersions = [];
store.removeVersion = async (songId, vid) => { removedVersions.push(`${songId}/${vid}`); };
await S.init(store);
S.newSong();
const D = S.current();
await S.saveVersion('지울 곡 v1');
S.newSong();
const E = S.current();
S.newAlbum({ fromSong: D });
const album = S.currentAlbum();
S.mutateAlbum((a) => { a.tracks.push({ songId: E.id, isTitle: false, isrc: '', lyricists: '', composers: '', arrangers: '', featuring: '', explicit: false }); });
await S.deleteSong(D.id);
assert.deepEqual(album.tracks.map((t) => t.songId), [E.id], '앨범에서 빠짐');
assert.equal(album.tracks[0].isTitle, true, '남은 곡이 타이틀');
assert.equal(removedVersions.length, 1, '버전 사본 삭제');
// 7) project.json 가져오기: 새 id·새 곡으로, 잘못된 파일은 거부
const before = S.getState().songs.length;
assert.equal(S.importSong({ hello: 1 }), false);
const src = JSON.parse(JSON.stringify(E));
assert.equal(S.importSong(src), true);
assert.equal(S.getState().songs.length, before + 1);
assert.notEqual(S.current().id, E.id, '새 id');
assert.ok(S.current().title.endsWith('(가져옴)'));
assert.equal(Object.keys(S.current().music.sections).length, S.current().sections.length);
// 8) 되돌리기·다시 하기: 버튼 동작(all)은 한 단계씩, 타이핑(quiet)은 2초 안이면 하나로 묶임
store = fakeStore();
await S.init(store);
S.newSong();
const U = S.current();
S.mutate((s) => { s.title = '하나'; });
S.mutate((s) => { s.music.bpm = 99; });
S.mutate((s) => { s.title = '하나둘'; }, 'quiet');
S.mutate((s) => { s.title = '하나둘셋'; }, 'quiet');
assert.equal(S.undo(), true);
assert.equal(U.title, '하나', '타이핑 묶음이 한 번에 되돌려짐');
assert.equal(U.music.bpm, 99);
S.undo();
assert.equal(U.music.bpm, 120, 'BPM 되돌림');
assert.equal(S.redo(), true);
assert.equal(U.music.bpm, 99, '다시 하기');
S.mutate((s) => { s.title = '새 갈래'; });
assert.equal(S.canRedo(), false, '새로 바꾸면 다시 하기 목록은 비워짐');
assert.ok(Array.isArray(U.versions) && U.id, 'id·버전 목록은 유지');

// 앨범 되돌리기: 앨범 화면에서는 Ctrl+Z가 앨범을 되돌린다 (곡 스택과 섞이지 않음)
S.newAlbum({ fromSong: U });
const AL = S.currentAlbum();
const firstTitle = AL.title;
const songUndoBefore = S.canUndo(U.id);
S.mutateAlbum((a) => { a.title = '앨범 하나'; });
S.mutateAlbum((a) => { a.tracks.splice(0, 1); });
assert.equal(AL.tracks.length, 0);
assert.equal(S.undo(), true, '앨범 화면 기본 대상은 앨범');
assert.equal(AL.tracks.length, 1, '뺀 트랙 되돌림');
assert.equal(AL.tracks[0].songId, U.id);
S.undo();
assert.equal(AL.title, firstTitle, '앨범 제목 되돌림');
assert.equal(S.redo(), true);
assert.equal(AL.title, '앨범 하나', '앨범 다시 하기');
assert.equal(S.canUndo(U.id), songUndoBefore, '곡 되돌리기 목록은 그대로');
S.mutateAlbum((a) => { a.promo.intro = '소개'; }, 'quiet');
S.mutateAlbum((a) => { a.promo.intro = '소개글'; }, 'quiet');
S.undo();
assert.equal(AL.promo.intro, '', '앨범 타이핑도 묶어서 되돌림');
assert.ok(AL.cover && AL.promo && Array.isArray(AL.tracks), '되돌린 뒤에도 앨범 형식 유지');
// 예시 곡을 고친 뒤 처음까지 되돌려도 예시 곡으로 돌아가지 않음
{
  await S.init(fakeStore()); // 빈 저장소 → 예시 곡 하나
  const ex = S.getState().songs.find((s) => s.example);
  assert.ok(ex, '예시 곡이 있어야 함');
  S.mutateSong(ex.id, (x) => { x.title = '고친 예시'; });
  assert.equal(ex.example, false);
  while (S.undo(ex.id)) { /* 처음까지 */ }
  assert.equal(ex.example, false, '되돌려도 내 곡으로 남음');
}
console.log('state OK');
process.exit(0);
