// 전체 백업·복원 점검: 버전 포함, 예시 곡 제외, 덮어쓰지 않음(같으면 건너뜀·다르면 사본), 앨범 곡 id 따라감, 취향 합침, zip 읽기.
import assert from 'node:assert/strict';
import { makeBackup, isBackup, planRestore, readImportFile, backupFileName } from '../src/js/backup.js';
import { zip, unzip } from '../src/js/music/pack.js';
import { emptyTaste } from '../src/js/learn/taste.js';

const song = (id, title, extra = {}) => ({ id, title, sections: [{ id: 's1', type: 'Verse', members: [], text: '가사' }], concept: { theme: '' }, style: {}, versions: [], updatedAt: 1, ...extra });
const a = song('a', '곡 A', { versions: [{ id: 'v1', at: 1, note: 'v1' }] });
const ex = song('ex', '예시: 곡', { example: true });
const album = { id: 'al', title: '앨범', tracks: [{ songId: 'a' }], updatedAt: 1 };
const taste = { ...emptyTaste(), log: [{ id: 't1', at: 1, kind: 'lyrics', rating: 1 }], profile: { ...emptyTaste().profile, lyrics: '이미지로' } };
const store = { v1: { id: 'v1', at: 1, note: 'v1', data: { title: '곡 A 옛날' } } };
const backup = await makeBackup({ songs: [a, ex], albums: [album], taste }, async (sid, vid) => store[vid]);
assert.ok(isBackup(backup));
assert.equal(backup.songs.length, 1, '예시 곡은 빼고');
assert.equal(backup.songs[0].versionData[0].data.title, '곡 A 옛날', '버전 본문 포함');
assert.match(backupFileName(new Date(2026, 9, 7, 9, 5)), /^kpop-backup-20261007-0905$/);

// 1) 빈 브라우저(예시 곡만)에 되살리기: 그대로 추가
let plan = planRestore({ songs: [ex], albums: [], taste: emptyTaste() }, backup);
assert.deepEqual(plan.report, { songs: 1, albums: 1, same: 0, taste: 1 });
assert.equal(plan.songs[0].song.id, 'a');
assert.equal(plan.songs[0].versions.length, 1);
assert.equal(plan.taste.profile.lyrics, '이미지로', '지금 프로필이 비었으면 백업 것');

// 2) 같은 내용이 이미 있으면 건너뜀
plan = planRestore({ songs: [a], albums: [album], taste }, backup);
assert.deepEqual(plan.report, { songs: 0, albums: 0, same: 2, taste: 0 });

// 3) 같은 id인데 내용이 다르면 덮어쓰지 않고 "(백업)" 사본 + 앨범 트랙도 사본을 가리킴
const changed = { ...a, title: '곡 A 고침' };
const myTaste = { ...emptyTaste(), log: [{ id: 't2', at: 2, kind: 'hook', rating: -1 }], profile: { ...emptyTaste().profile, lyrics: '내 프로필' } };
plan = planRestore({ songs: [changed], albums: [{ ...album, title: '앨범 고침' }], taste: myTaste }, backup);
assert.equal(plan.songs[0].song.title, '곡 A (백업)');
assert.notEqual(plan.songs[0].song.id, 'a');
assert.equal(plan.albums[0].tracks[0].songId, plan.songs[0].song.id);
assert.notEqual(plan.albums[0].id, 'al');
assert.deepEqual(plan.taste.log.map((e) => e.id), ['t1', 't2'], '취향 기록은 합쳐서 시간순');
assert.equal(plan.taste.profile.lyrics, '내 프로필', '지금 프로필은 유지');

// 4) 형식이 아닌 항목은 버림
plan = planRestore({ songs: [], albums: [], taste: emptyTaste() }, { ...backup, songs: [{ id: 1 }, ...backup.songs], albums: [{ nope: 1 }] });
assert.equal(plan.report.songs, 1);
assert.equal(plan.report.albums, 0);

// 5) 파일 읽기: json, 아티팩트용 zip(안의 json), 압축 없는 zip 왕복
const text = JSON.stringify(backup);
const asFile = (bytes) => ({ arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
assert.ok(isBackup(await readImportFile(asFile(new TextEncoder().encode(text)))));
const zipped = new Uint8Array(await zip([{ name: 'readme.txt', data: 'x' }, { name: 'kpop-backup-1.json', data: text }]).arrayBuffer());
assert.deepEqual(unzip(zipped).map((e) => e.name), ['readme.txt', 'kpop-backup-1.json']);
assert.ok(isBackup(await readImportFile(asFile(zipped))));
console.log('backup OK');
