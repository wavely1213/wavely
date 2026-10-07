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
