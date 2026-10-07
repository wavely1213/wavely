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

// 스타일 변형 A/B/C: 3개까지, 비어 있는 변형 버림, BPM·키·제외는 곡 값, 파일 이름에서 변형 찾기
const { parseVariants, variantStyle, variantFromName } = await import('../src/js/variants.js');
assert.throws(() => parseVariants({ variants: [{ idea: 'x' }] }), (e) => e.code === 'invalid_json');
const sv = parseVariants({ variants: [
  { idea: '원안', genre: 'K-pop dance pop', production: 'punchy' },
  { idea: '빈 것' },
  { idea: '밝게', genre: 'K-pop', vocals: 'bright', bpm: 99 },
  { idea: '미니멀', genre: 'minimal R&B' },
  { idea: '넷째', genre: 'x' },
] });
assert.deepEqual(sv.items.map((v) => [v.id, v.idea]), [['A', '원안'], ['B', '밝게'], ['C', '미니멀']]);
const vsong = { style: { genre: 'old', subgenre: 'keep', bpm: 118, key: 'F# minor', exclude: 'metal', vocals: 'old v' }, styleVariants: sv };
const vs = variantStyle(vsong, sv.items[1]);
assert.equal(vs.genre, 'K-pop');
assert.equal(vs.subgenre, 'keep', '변형에 없는 값은 지금 값');
assert.equal(vs.bpm, 118);
assert.equal(vs.key, 'F# minor');
assert.equal(vs.exclude, 'metal');
assert.equal(variantFromName('새벽 신호 B.wav', vsong), 'B');
assert.equal(variantFromName('song_c (1).mp3', vsong), 'C');
assert.equal(variantFromName('take-A-2.wav', vsong), 'A');
assert.equal(variantFromName('Basic mix.wav', vsong), '', '단어 안의 글자는 무시');
assert.equal(variantFromName('demo.wav', vsong), '');
assert.equal(variantFromName('x B.wav', { style: {} }), '', '변형을 안 만들었으면 없음');
console.log('variants OK');
console.log('takes OK');
