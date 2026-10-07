// 테이크 비교 점검: 키(같은 키·나란한조), BPM(±3·절반/두 배), 길이. 실행: npm run test:takes
import assert from 'node:assert/strict';
import { keyMatch, bpmMatch, compareTake } from '../src/js/music/takes.js';
import { exampleSong } from '../src/js/example.js';
import { normalizeMusic } from '../src/js/music/arrangement.js';
import { songSeconds } from '../src/js/music/arrangement.js';

assert.equal(keyMatch(9, 'minor', 9, 'minor'), 'same');
assert.equal(keyMatch(0, 'major', 9, 'minor'), 'relative', 'C major ↔ A minor');
assert.equal(keyMatch(9, 'minor', 0, 'major'), 'relative');
assert.equal(keyMatch(2, 'minor', 9, 'minor'), 'different');
assert.equal(bpmMatch(120, 118), 'same');
assert.equal(bpmMatch(59, 118), 'half');
assert.equal(bpmMatch(100, 118), 'different');

const song = normalizeMusic(exampleSong()); // 118 BPM, F# minor
const len = songSeconds(song);
const good = compareTake({ bpm: 117, root: 6, mode: 'minor', keyConfidence: 0.8, duration: len + 5 }, song);
const bad = compareTake({ bpm: 90, root: 2, mode: 'major', keyConfidence: 0.3, duration: len + 120 }, song);
assert.equal(good.score, 3);
assert.equal(bad.score, 0);
assert.ok(bad.notes.some((n) => n.includes('확신 낮음')));
console.log('takes OK');
