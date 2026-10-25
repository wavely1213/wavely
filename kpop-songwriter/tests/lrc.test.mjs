// 싱크 가사(LRC) 점검: 줄 목록, 상태, 시각 표기, 당기기·미루기, 파일 내용. 실행: npm run test:lrc
import assert from 'node:assert/strict';
import { syncLines, syncStatus, lrcTime, makeSync, shiftTimes, nudgeTime, toLrc } from '../src/js/album/lrc.js';

const song = {
  title: '새벽 신호',
  sections: [
    { type: 'Verse', text: '첫 줄\n\n둘째 줄' },
    { type: 'Chorus', text: '후렴 하나\n후렴 둘' },
    { type: 'Chorus', text: '' }, // 비운 반복 코러스는 앞 코러스 가사로
  ],
};
assert.deepEqual(syncLines(song), ['첫 줄', '둘째 줄', '후렴 하나', '후렴 둘', '후렴 하나', '후렴 둘']);

assert.equal(lrcTime(0), '00:00.00');
assert.equal(lrcTime(65.237), '01:05.24');
assert.equal(lrcTime(-3), '00:00.00');
assert.equal(lrcTime(599.999), '10:00.00');

assert.equal(syncStatus(song), 'none');
song.sync = makeSync(song, [1, 2.5, null], { duration: 30, master: 'm.wav' });
assert.equal(song.sync.lines.length, 6);
assert.equal(syncStatus(song), 'partial');
song.sync = makeSync(song, [1, 2.5, 4, 5.5, 3, 9], { duration: 30 });
assert.equal(syncStatus(song), 'order');
song.sync = makeSync(song, [1, 2.5, 4, 5.5, 7, 9], { duration: 30 });
assert.equal(syncStatus(song), 'ok');
song.sections[0].text = '첫 줄 고침\n둘째 줄';
assert.equal(syncStatus(song), 'stale', '가사를 고치면 다시 맞추기');
song.sections[0].text = '첫 줄\n둘째 줄';
assert.equal(syncStatus(song), 'ok', '빈 줄만 바뀐 건 같은 가사');

assert.deepEqual(shiftTimes([0.05, 1, null], -0.1), [0, 0.9, null]);
assert.deepEqual(nudgeTime([1, 2, 3], 1, 0.1), [1, 2.1, 3]);
assert.deepEqual(nudgeTime([1, 2, 2.05], 1, 0.1), [1, 2.05, 2.05], '다음 줄을 넘지 않음');
assert.deepEqual(nudgeTime([1, 1.05, 3], 1, -0.1), [1, 1, 3], '앞 줄보다 앞으로 가지 않음');
assert.deepEqual(nudgeTime([1, null, 3], 1, 0.1), [1, null, 3]);

const lrc = toLrc({ title: '새벽 신호', artist: '물결', album: 'Midnight Signal', lines: song.sync.lines, duration: 30 });
const rows = lrc.trim().split('\n');
assert.deepEqual(rows.slice(0, 4), ['[ti:새벽 신호]', '[ar:물결]', '[al:Midnight Signal]', '[length:00:30]']);
assert.equal(rows[4], '[00:01.00]첫 줄');
assert.equal(rows.length, 10);
assert.ok(!toLrc({ lines: [{ text: 'a', t: null }, { text: 'b', t: 2 }] }).includes(']a'), '안 찍은 줄은 빠짐');
console.log('lrc OK');
