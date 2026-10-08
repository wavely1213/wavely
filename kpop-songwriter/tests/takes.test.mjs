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
// 레퍼런스 음색: 쓰는 레퍼런스만 평균, 예전 분석(high 없음)은 저음만 맞춤, 범위 묶기
const { referenceTone, matchEq } = await import('../src/js/music/tonematch.js');
assert.equal(referenceTone({ references: [{ use: true, name: 'x' }] }), null, '분석 없으면 없음');
const rt = referenceTone({ references: [
  { use: true, name: 'A', analysis: { bass: 0.5, high: 0.2 } },
  { use: true, name: 'B', analysis: { bass: 0.3 } },
  { use: false, name: 'C', analysis: { bass: 0.9, high: 0.9 } },
] });
assert.deepEqual([rt.bass, rt.high, rt.n, rt.names.join()], [0.4, 0.2, 2, 'A,B']);
const same = matchEq({ bass: 0.4, high: 0.2 }, { bass: 0.4, high: 0.2 });
assert.deepEqual([same.lowDb, same.highDb, same.note], [0, 0, '저음 비슷 · 고음 비슷']);
const up = matchEq({ bass: 0.2, high: 0.1 }, { bass: 0.4, high: 0.141 });
assert.equal(up.lowDb, 4, '+6dB는 4로 묶음');
assert.equal(up.highDb, 3);
assert.equal(up.eq.mud, -1, '저음을 많이 올리면 웅웅 대역을 덜어 냄');
assert.equal(up.eq.air, 3);
const noHigh = matchEq({ bass: 0.4, high: 0.2 }, { bass: 0.2, high: null });
assert.equal(noHigh.highDb, null);
assert.equal(noHigh.lowDb, -4);
assert.ok(noHigh.note.includes('다시 분석'));
console.log('tone OK');
console.log('takes OK');

// 숏폼 하이라이트: 큰 구간(40~70초)을 찾고, 시작은 바로 앞 조용한 순간, 페이드, 짧은 곡은 전체
{
  const { bestWindow, cutClip, blockRms } = await import('../src/js/music/highlight.js');
  const rate = 8000;
  const len = rate * 100;
  const L = new Float32Array(len);
  for (let i = 0; i < len; i++) { const t = i / rate; L[i] = (t >= 40 && t < 70 ? 0.5 : 0.1) * Math.sin(2 * Math.PI * 220 * t); }
  assert.equal(blockRms([L, L], rate).length, 400);
  assert.deepEqual(bestWindow([L, L], rate, 30), { start: 39.75, end: 69.75 });
  assert.deepEqual(bestWindow([L, L], rate, 15), { start: 39.75, end: 54.75 }, '코러스가 터지는 지점에서 시작');
  const clip = cutClip([L, L], rate, 39.75, 69.75);
  assert.equal(clip[0].length, 30 * rate);
  assert.equal(clip[0][0], 0, '페이드 인');
  assert.ok(Math.abs(clip[0][clip[0].length - 1]) < 1e-6, '페이드 아웃');
  assert.ok(Math.max(...clip[0].slice(rate * 5, rate * 6)) > 0.49, '가운데는 그대로');
  assert.notEqual(clip[0].buffer, L.buffer, '원본은 건드리지 않음');
  assert.deepEqual(bestWindow([L.slice(0, rate * 10), L.slice(0, rate * 10)], rate, 30), { start: 0, end: 10 });
  console.log('highlight OK');
}

// 소리 점검: 스테레오 상관(같음 1, 반대 -1, 무관 ~0), 잘린 파형 구간 수
{
  const { stereoCorrelation, clippedRuns } = await import('../src/js/music/qc.js');
  const n = 48000;
  const a = new Float32Array(n).map((_, i) => Math.sin(i / 7));
  const inv = a.map((x) => -x);
  const other = new Float32Array(n).map((_, i) => Math.sin(i / 3.3 + 1));
  assert.ok(stereoCorrelation(a, a) > 0.999);
  assert.ok(stereoCorrelation(a, inv) < -0.999);
  assert.ok(Math.abs(stereoCorrelation(a, other)) < 0.1);
  assert.equal(stereoCorrelation(a, null), 1, '모노 파일');
  const clip = new Float32Array(100);
  clip.set([1, 1, 1, 1], 10); clip.set([-1, -1, -1], 50); clip.set([1, 1], 80); clip.set([1, 1, 1], 97);
  assert.equal(clippedRuns([clip]), 3, '2개 이어진 것은 빼고, 끝에 걸친 것도 셈');
  console.log('qc OK');
}
