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
console.log('state OK');
process.exit(0);
