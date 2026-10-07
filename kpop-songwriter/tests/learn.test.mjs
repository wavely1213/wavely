// 취향 학습 로직 점검: 기록 상한, 같은 대상 재평가, 프롬프트 블록, JSONL. 실행: npm run test:learn
import assert from 'node:assert/strict';
import { emptyTaste, makeEntry, addEntry, promptBlock, tasteStats, toJsonl, MAX_LOG } from '../src/js/learn/taste.js';

const t = emptyTaste();
assert.equal(promptBlock(t, 'lyrics'), ''); // 아무것도 없으면 프롬프트에 안 붙음

addEntry(t, makeEntry({ kind: 'lyrics', rating: 1, text: '좋은 줄', context: { ref: 'a' } }));
addEntry(t, makeEntry({ kind: 'lyrics', rating: -1, text: '좋은 줄', reasons: ['유치해요'], context: { ref: 'a' } }));
assert.equal(t.log.length, 1, '같은 대상 재평가는 덮어쓴다');
assert.equal(t.log[0].rating, -1);
addEntry(t, makeEntry({ kind: 'lyrics', rating: 0, before: 'AI 초안', after: '내가 고침', context: { ref: 'a' } }));
assert.equal(t.log.length, 2, '고침 기록은 평가와 따로 남는다');
addEntry(t, makeEntry({ kind: 'lyrics', rating: 1, text: '마음에 든 가사', context: { ref: 'b' } }));
addEntry(t, makeEntry({ kind: 'arrange', rating: 1, text: '편곡', context: { ref: 'c', bpm: 120, instruments: ['drums', 'b808'] } }));
addEntry(t, makeEntry({ kind: 'arrange', rating: 1, text: '편곡2', context: { ref: 'd', bpm: 96, instruments: ['b808'] } }));

const st = tasteStats(t);
assert.deepEqual(st.bpmRange, [96, 120]);
assert.equal(st.instruments[0], 'b808');
assert.deepEqual(st.reasons, [['유치해요', 1]]);

t.profile.lyrics = '이미지로 말하기';
const lyr = promptBlock(t, 'lyrics');
assert.ok(lyr.includes('이미지로 말하기') && lyr.includes('마음에 든 가사') && lyr.includes('내가 고침') && lyr.includes('유치해요'));
assert.ok(!lyr.includes('BPM'), '가사 요청엔 편곡 통계를 넣지 않는다');
assert.ok(promptBlock(t, 'arrange').includes('96~120'));
t.enabled = false;
assert.equal(promptBlock(t, 'lyrics'), '', '끄면 반영 안 함');

for (let i = 0; i < MAX_LOG + 20; i++) addEntry(t, makeEntry({ kind: 'hook', rating: 1, text: `훅 ${i}`, context: { ref: `h${i}` } }));
assert.equal(t.log.length, MAX_LOG, '기록은 최근 MAX_LOG개만');
assert.ok(JSON.stringify(t).length < 200 * 1024, '문서 크기 한도 안');
const lines = toJsonl(t).trim().split('\n');
assert.equal(lines.length, MAX_LOG);
assert.equal(JSON.parse(lines[0]).kind, 'hook');
console.log('learn OK');
