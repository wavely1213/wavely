// 취향 학습 로직 점검: 기록 상한, 같은 대상 재평가, 프롬프트 블록, JSONL. 실행: npm run test:learn
import assert from 'node:assert/strict';
import { emptyTaste, makeEntry, addEntry, promptBlock, tasteStats, toJsonl, MAX_LOG, preferencePairs, pairsJsonl } from '../src/js/learn/taste.js';

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
// 줄 단위 ♥: 통째 예시와 따로 "고른 줄"로 들어간다
addEntry(t, makeEntry({ kind: 'lyrics', rating: 1, text: '네온 아래 숨을 고르고', context: { ref: 'g1#네온 아래 숨을 고르고', line: true } }));
const lyr2 = promptBlock(t, 'lyrics');
assert.ok(lyr2.includes('특히 좋다고 고른 줄') && lyr2.includes('- 네온 아래 숨을 고르고'));
assert.ok(!lyr2.split('특히 좋다고 고른 줄')[0].includes('네온 아래'), '줄 반응은 통째 예시에 섞이지 않음');
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

// 정리 추천: 마지막 정리 뒤 새 반응 수
import { newSinceSummary, SUMMARY_EVERY } from '../src/js/learn/taste.js';
{
  const t2 = emptyTaste();
  for (let i = 0; i < SUMMARY_EVERY; i++) addEntry(t2, makeEntry({ kind: 'hook', rating: 1, text: `x${i}`, context: { ref: `r${i}` } }));
  assert.equal(newSinceSummary(t2), SUMMARY_EVERY);
  t2.profile.summarizedAt = Date.now() + 1;
  assert.equal(newSinceSummary(t2), 0);
  console.log('summary hint OK');
}

// 선호 쌍: 고침(전→후), 스타일 변형 선택(고름↔나머지), 같은 종류·섹션의 👍↔👎, 줄 ♥는 제외
{
  const pt = emptyTaste();
  addEntry(pt, makeEntry({ kind: 'lyrics', rating: 0, before: 'AI 초안', after: '내가 고침', context: { ref: 'g1', section: 'Verse' } }));
  addEntry(pt, makeEntry({ kind: 'lyrics', rating: 0, before: '같음', after: '같음 ', context: { ref: 'g2', section: 'Verse' } }));
  addEntry(pt, makeEntry({ kind: 'style', rating: 1, text: '스타일 B', context: { ref: 'v1', rejected: ['스타일 A', '스타일 C'] } }));
  addEntry(pt, makeEntry({ kind: 'lyrics', rating: 1, text: '좋은 벌스', context: { ref: 'g3', section: 'Verse' } }));
  addEntry(pt, makeEntry({ kind: 'lyrics', rating: -1, text: '별로 벌스', reasons: ['유치해요'], context: { ref: 'g4', section: 'Verse' } }));
  addEntry(pt, makeEntry({ kind: 'lyrics', rating: -1, text: '별로 코러스', context: { ref: 'g5', section: 'Chorus' } }));
  addEntry(pt, makeEntry({ kind: 'lyrics', rating: 1, text: '♥ 줄', context: { ref: 'g3#x', section: 'Verse', line: true } }));
  const pairs = preferencePairs(pt);
  assert.deepEqual(pairs.map((p) => [p.source, p.chosen, p.rejected]), [
    ['edit', '내가 고침', 'AI 초안'],
    ['choice', '스타일 B', '스타일 A'],
    ['choice', '스타일 B', '스타일 C'],
    ['rating', '좋은 벌스', '별로 벌스'],
  ]);
  assert.deepEqual(pairs[3].reasons, ['유치해요']);
  const lines = pairsJsonl(pt).trim().split('\n');
  assert.equal(lines.length, 4);
  assert.ok(JSON.parse(lines[0]).at.endsWith('Z'));
  console.log('pairs OK');
}

