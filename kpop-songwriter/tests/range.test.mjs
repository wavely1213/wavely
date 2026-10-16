// 보컬 음역 점검: 멤버 음역 겹침, 랩 제외, 음역 밖 음 찾기·옮기기, 예시 곡은 음역 안. 실행: npm run test:range
import assert from 'node:assert/strict';
import { sectionRange, outOfRange, foldIntoRange, degreeRange, defaultVoice } from '../src/js/music/range.js';
import { exampleSong } from '../src/js/example.js';
import { degreeToMidi } from '../src/js/music/theory.js';

const song = exampleSong();
const chorus = song.sections.find((s) => s.type === 'Chorus');
const r = sectionRange(song, chorus);
assert.deepEqual([r.low, r.high], [60, 77], '여성 고음(60~81) ∩ 여성 중음(57~77), 랩은 빠짐');
assert.equal(r.conflict, false);
const rap = song.sections.find((s) => s.type === 'Rap');
assert.equal(sectionRange(song, rap), null, '랩만 부르면 제한 없음');
assert.equal(sectionRange(song, song.sections.find((s) => s.type === 'Intro')), null, '멤버 없으면 제한 없음');

const { root, mode } = song.music;
const mel = song.music.sections[chorus.id].melody;
assert.deepEqual(outOfRange(mel, root, mode, r), [], '예시 곡 코러스는 음역 안');

const high = [{ s: 0, l: 2, d: 10 }, { s: 2, l: 2, d: 2 }, { s: 4, l: 2, d: -5 }];
const out = outOfRange(high, root, mode, r);
assert.deepEqual(out, [0, 2]);
const folded = foldIntoRange(high, root, mode, r);
assert.deepEqual(outOfRange(folded, root, mode, r), [], '옥타브를 옮겨 모두 음역 안');
assert.equal(folded[1].d, 2, '안에 있던 음은 그대로');
const dr = degreeRange(root, mode, r);
assert.ok(degreeToMidi(root, mode, dr.lo) >= 60 && degreeToMidi(root, mode, dr.hi) <= 77);

// 남성 저음 + 여성 고음은 겹치는 폭이 좁다 (60~62)
const mixed = { ...song, members: [{ id: 'a', name: 'A', voice: 'm-low' }, { id: 'b', name: 'B', voice: 'f-high' }] };
const mr = sectionRange(mixed, { members: ['a', 'b'] });
assert.deepEqual([mr.low, mr.high, mr.conflict], [60, 62, false]);
assert.equal(defaultVoice('boy', '메인보컬'), 'm-mid');
assert.equal(defaultVoice('girl', '리드래퍼'), 'rap');
console.log('range OK');
