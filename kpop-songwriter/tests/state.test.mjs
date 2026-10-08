// 상태 점검: 느린 작업 중 곡을 바꿔도 원래 곡에만 반영되는지, 저장 하나가 실패해도 나머지는 저장되는지,
// 취향을 못 불러왔을 때 덮어쓰지 않는지, 예시 곡을 앨범에 넣으면 저장되는지. 실행: npm run test:state
import assert from 'node:assert/strict';
import * as S from '../src/js/state.js';
import { addEntry, makeEntry } from '../src/js/learn/taste.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function fakeStore({ failSave = () => false, tasteFails = false, storedTaste = null, tasteDelay = 0 } = {}) {
  const saved = {};
  const versions = {};
  const ctl = { tasteFails, storedTaste, tasteDelay }; // 테스트 중에 바꿀 수 있게
  return {
    kind: 'local',
    ctl,
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
    async loadTaste() { await wait(ctl.tasteDelay); if (ctl.tasteFails) throw new Error('down'); return ctl.storedTaste; },
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
assert.equal(S.getState().saveStatus, 'error', '저장됨이라고 하지 않음');

// 4b) 처음에 못 불러온 취향은 저장할 때 다시 불러와 이번 세션의 반응을 얹는다
{
  const stored = {
    profile: { lyrics: '기존' },
    log: [
      { id: 'old', at: 1, kind: 'lyrics', rating: 1, text: 'a', context: { ref: 'x' }, reasons: [] },
      { id: 'keep', at: 2, kind: 'hook', rating: 1, text: 'h', context: { ref: 'y' }, reasons: [] },
    ],
  };
  const st = fakeStore({ tasteFails: true, storedTaste: stored });
  await S.init(st);
  assert.equal(S.getState().tasteLoaded, false);
  st.ctl.tasteFails = false; // 잠깐의 실패였음
  S.mutateTaste((t) => {
    addEntry(t, makeEntry({ kind: 'hook', rating: 1, text: 'z', context: { ref: 'z' } }));
    addEntry(t, makeEntry({ kind: 'lyrics', rating: -1, text: 'b', context: { ref: 'x' } }));
    t.profile.lyrics = '이번 세션';
  });
  await wait(1400);
  assert.equal(S.getState().saveStatus, 'saved');
  assert.equal(S.getState().tasteLoaded, true);
  const log = st.saved.taste.log;
  assert.deepEqual(log.map((e) => e.id).slice(0, 1), ['keep']);
  assert.ok(!log.some((e) => e.id === 'old'), '같은 대상의 예전 평가는 새 평가로 바뀜');
  assert.ok(log.some((e) => e.context.ref === 'x' && e.rating === -1));
  assert.ok(log.some((e) => e.context.ref === 'z'));
  assert.equal(st.saved.taste.profile.lyrics, '기존', '저장된 프로필이 있으면 그것을 둠');
  assert.equal(S.getState().taste.log.length, 3, '화면이 쓰는 취향도 합친 것');

  // 다시 불러오는 동안 생긴 반응도 남는다
  const st2 = fakeStore({ tasteFails: true, storedTaste: stored, tasteDelay: 0 });
  await S.init(st2);
  st2.ctl.tasteFails = false;
  st2.ctl.tasteDelay = 300;
  S.mutateTaste((t) => { addEntry(t, makeEntry({ kind: 'hook', rating: 1, text: 'p', context: { ref: 'p' } })); });
  await wait(1300); // 저장 시작 → 불러오는 중
  S.mutateTaste((t) => { addEntry(t, makeEntry({ kind: 'hook', rating: 1, text: 'q', context: { ref: 'q' } })); });
  await wait(2000);
  const refs = st2.saved.taste.log.map((e) => e.context.ref);
  assert.ok(refs.includes('p') && refs.includes('q') && refs.includes('y'), refs.join(','));
  console.log('taste reload OK');
}

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
// 곡 복제: 새 id·섹션 id, 편곡·멜로디·번안은 새 섹션 id로 옮김, 싱크·버전·Suno·마스터링 진행은 비움, 원본 그대로
{
  await S.init(fakeStore());
  const orig = S.current();
  S.mutateSong(orig.id, (x) => {
    x.title = '원곡';
    x.sync = { key: 'k', lines: [] };
    x.progress = { arranged: true, suno: true, mastered: true };
    x.translations = { ja: { key: 'k', sections: { [x.sections[1].id]: [{ text: 'テスト' }] } } };
  });
  const firstMusic = JSON.stringify(orig.music.sections[orig.sections[1].id]);
  const copy = S.duplicateSong(orig.id);
  assert.notEqual(copy.id, orig.id);
  assert.equal(S.current().id, copy.id, '사본을 열어 줌');
  assert.equal(copy.title, '원곡 (사본)');
  assert.equal(copy.sections.length, orig.sections.length);
  assert.ok(copy.sections.every((sec, i) => sec.id !== orig.sections[i].id && sec.text === orig.sections[i].text));
  assert.equal(JSON.stringify(copy.music.sections[copy.sections[1].id]), firstMusic, '편곡·멜로디를 새 섹션 id로');
  assert.equal(copy.translations.ja.sections[copy.sections[1].id][0].text, 'テスト');
  assert.equal(copy.sync, null);
  assert.deepEqual(copy.versions, []);
  assert.deepEqual(copy.progress, { arranged: true, suno: false, mastered: false });
  assert.equal(orig.title, '원곡', '원본 그대로');
  assert.ok(orig.sync);
  const before = S.getState().songs.length;
  assert.equal(S.duplicateSong('없음'), null);
  assert.equal(S.getState().songs.length, before);
}
// Inst. 버전: 가사·멜로디 비운 사본이 원곡 바로 뒤 트랙으로, 작사·피처링·ISRC는 비움, 화면은 앨범 그대로
{
  await S.init(fakeStore());
  const orig = S.current();
  S.mutateSong(orig.id, (x) => { x.title = '타이틀'; });
  S.newAlbum({ fromSong: orig });
  const al = S.currentAlbum();
  S.mutateAlbum((a) => { Object.assign(a.tracks[0], { lyricists: '물결', composers: '하늘', arrangers: '바다', isrc: 'KRA012600001', explicit: true }); });
  const inst = S.addInstVersion(al.id, orig.id);
  assert.equal(inst.title, '타이틀 (Inst.)');
  assert.equal(inst.instOf, orig.id);
  assert.ok(inst.sections.every((sec) => !sec.text));
  assert.ok(Object.values(inst.music.sections).every((sm) => !sm.melody.length));
  assert.deepEqual(al.tracks.map((t) => t.songId), [orig.id, inst.id]);
  assert.deepEqual([al.tracks[1].lyricists, al.tracks[1].composers, al.tracks[1].arrangers, al.tracks[1].isrc, al.tracks[1].explicit, al.tracks[1].isTitle], ['', '하늘', '바다', '', false, false]);
  assert.equal(S.getState().mode, 'album');
  assert.equal(S.addInstVersion(al.id, 'none'), null);
}

// 앨범·취향 화면에서 새 곡을 만들면 그 곡으로 간다 / 앨범의 새 곡은 타이틀곡의 그룹·멤버를 이어받아 트랙 끝에 들어간다
{
  await S.init(fakeStore());
  S.newSong();
  const T = S.current();
  S.mutate((s) => {
    s.title = '타이틀';
    s.concept.group = 'boy';
    s.concept.koRatio = 50;
    s.style.vocals = 'powerful boy group vocals';
    s.members = [{ id: 'm1', name: '준', position: '메인보컬', tone: '', voice: 'm-high' }, { id: 'm2', name: '하늘', position: '메인래퍼', tone: '', voice: 'rap' }];
  });
  S.newAlbum({ fromSong: T });
  const al = S.currentAlbum();
  assert.equal(S.getState().mode, 'album');
  S.newSong();
  assert.equal(S.getState().mode, 'song', '앨범 화면에서 + 새 곡 → 새 곡으로');
  S.showTaste();
  S.newSong();
  assert.equal(S.getState().mode, 'song', '취향 화면에서 + 새 곡 → 새 곡으로');
  const n = S.newSongInAlbum(al.id);
  assert.equal(S.getState().mode, 'song');
  assert.equal(S.current().id, n.id);
  assert.deepEqual(n.members.map((m) => m.name), ['준', '하늘']);
  assert.ok(n.members.every((m) => !['m1', 'm2'].includes(m.id)), '멤버 id는 새로');
  assert.equal(n.concept.group, 'boy');
  assert.equal(n.concept.koRatio, 50);
  assert.equal(n.style.vocals, 'powerful boy group vocals');
  assert.equal(n.concept.theme, '');
  assert.ok(n.sections.some((x) => x.members.length), '파트 자동 분배');
  assert.equal(al.tracks.at(-1).songId, n.id);
  assert.equal(al.tracks.at(-1).isTitle, false);
  assert.equal(al.tracks.at(-1).composers, '', '크레딧은 이어받지 않음');
  S.newAlbum();
  S.mutateAlbum((a) => { a.tracks = []; });
  const first = S.newSongInAlbum(S.currentAlbum().id);
  assert.equal(first.members.length, 0);
  assert.equal(S.currentAlbum().tracks.length, 1);
  assert.equal(S.currentAlbum().tracks[0].isTitle, true, '빈 앨범의 첫 곡은 타이틀');
  S.selectAlbum(S.currentAlbum().id);
  S.undo();
  assert.equal(S.currentAlbum().tracks.length, 0, '앨범 되돌리기로 트랙 빠짐');
  // Inst. 버전: 되돌리기로 트랙만 빠진 뒤 다시 더하면 같은 Inst. 곡을 다시 씀 (사본이 쌓이지 않음)
  const src = first.id;
  S.mutateAlbum((a) => { a.tracks = [{ songId: src, isTitle: true, isrc: '', lyricists: '', composers: '', arrangers: '', featuring: '', explicit: false, splits: {} }]; });
  const instA = S.addInstVersion(S.currentAlbum().id, src);
  S.selectAlbum(S.currentAlbum().id);
  S.undo();
  // 그 사이 원곡 제목·BPM이 바뀌면, 손대지 않은 사본은 원곡의 지금 상태로 다시 (같은 id)
  S.mutateSong(src, (x) => { x.title = 'Midnight Signal'; x.music.bpm = 140; });
  const instB = S.addInstVersion(S.currentAlbum().id, src);
  assert.equal(instB.id, instA.id);
  assert.equal(instB.title, 'Midnight Signal (Inst.)');
  assert.equal(instB.music.bpm, 140);
  assert.equal(S.getState().songs.filter((x) => x.instOf === src).length, 1);
  assert.equal(S.currentAlbum().tracks.filter((t) => t.songId === instA.id).length, 1);
  // 고친 사본은 편곡을 그대로 두고 제목만 원곡을 따라감
  S.selectAlbum(S.currentAlbum().id);
  S.undo();
  const touched = S.getState().songs.find((x) => x.id === instA.id);
  touched.createdAt -= 5000; // 만든 지 5초 뒤에 고친 것으로
  S.mutateSong(instA.id, (x) => { x.music.bpm = 99; });
  S.mutateSong(src, (x) => { x.title = 'Signal 2'; });
  const instC = S.addInstVersion(S.currentAlbum().id, src);
  assert.equal(instC.id, instA.id);
  assert.equal(instC.music.bpm, 99);
  assert.equal(instC.title, 'Signal 2 (Inst.)');
  // 작곡가가 바꾼 Inst. 제목은 원곡을 따라가지 않음
  S.mutateSong(instA.id, (x) => { x.title = 'Signal Acoustic (Inst.)'; });
  S.selectAlbum(S.currentAlbum().id);
  S.undo();
  S.mutateSong(src, (x) => { x.title = 'Signal 3'; });
  assert.equal(S.addInstVersion(S.currentAlbum().id, src).title, 'Signal Acoustic (Inst.)');
  // 예전(instTitle 없는) 사본은 " (Inst.)"로 끝나면 원곡 제목을 따라감
  const legacy = S.getState().songs.find((x) => x.id === instA.id);
  legacy.title = 'Signal 3 (Inst.)';
  delete legacy.instTitle;
  S.selectAlbum(S.currentAlbum().id);
  S.undo();
  S.mutateSong(src, (x) => { x.title = 'Signal 4'; });
  assert.equal(S.addInstVersion(S.currentAlbum().id, src).title, 'Signal 4 (Inst.)');
  console.log('new song in album OK');
}

// 칸을 벗어날 때의 빈 변경·버전 저장·진행 표시는 되돌리기 단계를 남기지 않는다
{
  await S.init(fakeStore());
  S.newSong();
  const T = S.current();
  S.mutate((s) => { s.title = 'Old'; });
  S.mutate((s) => { s.title = 'N'; }, 'quiet');
  S.mutate((s) => { s.title = 'New'; }, 'quiet');
  S.mutate(() => {}); // 칸을 벗어남
  S.undo();
  assert.equal(T.title, 'Old', '한 번의 ↶로 타이핑 전으로');
  S.redo();
  assert.equal(T.title, 'New');
  S.undo();
  S.mutate(() => {});
  assert.equal(S.canRedo(), true, '빈 변경은 다시 하기 목록을 지우지 않음');
  S.redo();
  S.mutate((s) => { s.sections[0].text = '가사'; });
  assert.equal(await S.saveVersion('x'), true);
  S.undo();
  assert.equal(T.sections[0].text, '', '버전 저장 뒤 ↶는 마지막 고침을 되돌림');
  S.mutate((s) => { s.sections[0].text = '가사2'; });
  S.markProgress(T.id, 'suno');
  assert.equal(T.progress.suno, true);
  S.undo();
  assert.equal(T.sections[0].text, '', '진행 표시는 단계를 남기지 않음');
  assert.equal(T.progress.suno, true, '되돌려도 Suno 진행은 유지');
  S.redo();
  assert.equal(T.progress.suno, true);
  // 빈 변경 뒤 2초 안에 다른 칸을 타이핑해도 앞 타이핑과 묶이지 않음
  S.mutate((s) => { s.story = '가'; }, 'quiet');
  S.mutate(() => {});
  S.mutate((s) => { s.theme = '나'; }, 'quiet');
  S.undo();
  assert.equal(T.story, '가', '다른 칸 타이핑은 따로 되돌림');
  S.newAlbum({ fromSong: T });
  const AL2 = S.currentAlbum();
  S.mutateAlbum((a) => { a.title = 'A1'; });
  S.mutateAlbum((a) => { a.title = 'A12'; }, 'quiet');
  S.mutateAlbum(() => {});
  S.undo();
  assert.equal(AL2.title, 'A1', '앨범도 한 번의 ↶로');
  console.log('no-op undo OK');
}

// 버전 보관: 복원하는 버전은 지우지 않고, 넘치면 복원 전 자동 저장부터 지운다
{
  const setup = async () => {
    const st = fakeStore();
    st.maxVersions = 8;
    const removed = [];
    st.removeVersion = async (songId, vid) => { removed.push(vid); };
    await S.init(st);
    S.newSong();
    for (let i = 1; i <= 8; i++) {
      S.mutate((s) => { s.title = `draft ${i}`; });
      await S.saveVersion(`v${i}`);
    }
    return { song: S.current(), removed };
  };
  let { song, removed } = await setup();
  const v1 = song.versions.find((v) => v.note === 'v1');
  const v2 = song.versions.find((v) => v.note === 'v2');
  assert.equal(await S.restoreVersion(v1.id), true);
  assert.equal(song.versions.length, 8);
  assert.ok(song.versions.some((v) => v.id === v1.id), '복원한 가장 오래된 버전이 남음');
  assert.ok(!removed.includes(v1.id));
  assert.equal(song.versions[0].note, '복원 전 자동 저장');
  assert.equal(song.versions[0].auto, true);
  assert.equal(song.title, 'draft 1');
  assert.deepEqual(removed, [v2.id], '이름 붙인 버전 하나(v2)만 지움');

  ({ song, removed } = await setup());
  const v5 = song.versions.find((v) => v.note === 'v5');
  for (let i = 0; i < 3; i++) assert.equal(await S.restoreVersion(v5.id), true);
  assert.equal(song.versions.length, 8);
  assert.equal(song.versions.filter((v) => S.isAutoVersion(v)).length, 1, '자동 저장은 가장 최근 하나만');
  assert.deepEqual(song.versions.filter((v) => !v.auto).map((v) => v.note), ['v8', 'v7', 'v6', 'v5', 'v4', 'v3', 'v2']);
  assert.equal(removed.length, 3, 'v1과 앞선 자동 저장 둘');

  // 예전 기록(auto 표시 없음)도 메모로 알아보고, 방금 만든 것·keepId는 지우지 않음
  const list = [{ id: 'new' }, { id: 'a', note: '복원 전 자동 저장' }, { id: 'b', note: 'b' }, { id: 'c', note: 'c' }];
  assert.deepEqual(S.versionsToDrop(list, 3, 'c').map((v) => v.id), ['a']);
  assert.deepEqual(S.versionsToDrop(list, 2, 'c').map((v) => v.id), ['a', 'b']);
  assert.deepEqual(S.versionsToDrop(list, 1, 'c').map((v) => v.id), ['a', 'b'], '방금 만든 것과 keep은 남김');
  assert.deepEqual(S.versionsToDrop(list, 4, 'c'), []);
  console.log('version keep OK');
}

console.log('state OK');
process.exit(0);
