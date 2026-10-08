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


// 학습 효과: 👍/👎만 시간 순으로 반씩 나눠 비교 (줄 ♥·고른 것·고침은 빼고)
import { satisfactionTrend, trendText } from '../src/js/learn/taste.js';
{
  const e = (rating, at, context = {}) => ({ id: String(at), at, kind: 'lyrics', rating, text: 'x', reasons: [], context });
  const few = { log: [e(1, 1), e(-1, 2)] };
  assert.equal(satisfactionTrend(few), null);
  const log = [];
  for (let i = 0; i < 6; i++) log.push(e(i < 2 ? 1 : -1, i)); // 처음 6개: 👍 2 (33%)
  for (let i = 6; i < 12; i++) log.push(e(i < 11 ? 1 : -1, i)); // 최근 6개: 👍 5 (83%)
  log.push(e(1, 50, { line: true }), e(1, 51, { rejected: ['a'] }), e(0, 52), e(1, 53, { source: 'release' }), e(1, 54, { source: 'release' })); // 세지 않음 (발매 성과로 배운 것 포함)
  const t = satisfactionTrend({ log: log.reverse() });
  assert.deepEqual([t.n, Math.round(t.early * 100), Math.round(t.recent * 100), t.diff], [6, 33, 83, 50]);
  assert.equal(trendText(t), '처음 6개 33% → 최근 6개 83% (좋아지고 있어요)');
  console.log('satisfaction trend OK');
}

// 취향 합치기: 같은 id는 한 번, 시간순, 최근 MAX_LOG개. 프로필은 base가 비어 있을 때만 extra 것
import { mergeTaste } from '../src/js/learn/taste.js';
{
  const e = (id, at, ref, rating = 1) => ({ id, at, kind: 'lyrics', rating, text: id, context: { ref }, reasons: [] });
  const base = { profile: { lyrics: '내 취향' }, log: [e('a', 1, 'r1'), e('b', 3, 'r2')] };
  const extra = { profile: { lyrics: '다른 것' }, log: [e('b', 3, 'r2'), e('c', 2, 'r3'), { at: 5 }, null] };
  let m = mergeTaste(base, extra);
  assert.deepEqual(m.taste.log.map((x) => x.id), ['a', 'c', 'b'], '시간순, 중복·id 없는 것 빼고');
  assert.equal(m.added, 1);
  assert.equal(m.changed, true);
  assert.equal(m.taste.profile.lyrics, '내 취향', '채운 프로필은 그대로');
  m = mergeTaste({ log: [] }, extra);
  assert.equal(m.taste.profile.lyrics, '다른 것', '빈 프로필이면 extra 것');
  assert.equal(mergeTaste(base, { log: [e('a', 1, 'r1')] }).changed, false);
  // replace: 같은 대상의 이전 평가는 새것으로
  m = mergeTaste(base, { log: [e('n', 9, 'r1', -1)] }, { replace: true });
  assert.deepEqual(m.taste.log.map((x) => x.id), ['b', 'n']);
  // 최근 MAX_LOG개
  const many = { log: Array.from({ length: MAX_LOG + 5 }, (_, i) => e(`m${i}`, 100 + i, `q${i}`)) };
  m = mergeTaste(base, many);
  assert.equal(m.taste.log.length, MAX_LOG);
  assert.equal(m.taste.log.at(-1).id, `m${MAX_LOG + 4}`);
  console.log('taste merge OK');
}

// AI 정리는 바뀌기 전 프로필을 남기고, 되돌리기는 맞바꾼다 (프롬프트·내보내기에는 안 들어감)
import { applySummary, swapPrevProfile, normalizeTaste, profileText } from '../src/js/learn/taste.js';
{
  const t = emptyTaste();
  t.profile.lyrics = '손글씨';
  t.profile.sound = '808';
  assert.equal(swapPrevProfile(t), false, '되돌릴 것이 없음');
  assert.equal(applySummary(t, { lyrics: 'AI', sound: '', avoid: 'AI 피할' }, 1000), true);
  assert.equal(t.profile.lyrics, 'AI');
  assert.equal(t.profile.sound, '808', '빈 결과는 지금 것을 둠');
  assert.equal(t.profile.prev.lyrics, '손글씨');
  assert.equal(t.profile.summarizedAt, 1000);
  assert.ok(!promptBlock(t).includes('손글씨'), '이전 프로필은 AI 요청에 안 들어감');
  assert.ok(!toJsonl(t).includes('손글씨'));
  assert.equal(swapPrevProfile(t, 2000), true);
  assert.equal(t.profile.lyrics, '손글씨');
  assert.equal(t.profile.avoid, '');
  assert.equal(t.profile.prev.lyrics, 'AI');
  swapPrevProfile(t);
  assert.equal(t.profile.lyrics, 'AI', '다시 누르면 AI 정리로');
  const before = t.profile.prev;
  assert.equal(applySummary(t, { lyrics: 'AI', sound: '808', avoid: 'AI 피할' }), false);
  assert.equal(t.profile.prev, before, '바뀐 게 없으면 prev 그대로');
  assert.deepEqual(normalizeTaste({ profile: { prev: { lyrics: 1, at: '5' } } }).profile.prev, { lyrics: '1', sound: '', avoid: '', at: 5 });
  assert.equal('prev' in normalizeTaste({ profile: { prev: 'x' } }).profile, false);
  assert.deepEqual(Object.keys(profileText(t.profile)), ['lyrics', 'sound', 'avoid']);
  console.log('profile revert OK');
}

// 멜로디 👍는 음높이까지 예시로 들어가고, 글이 같은 👍·👎는 선호 쌍이 되지 않는다
{
  const t = emptyTaste();
  addEntry(t, makeEntry({ kind: 'melody', rating: 1, text: 'Chorus 1: 불4 꺼5 진7~', context: { ref: 'm1', section: 'Chorus' } }));
  assert.ok(promptBlock(t, 'melody').includes('- Chorus 1: 불4 꺼5 진7~'));
  addEntry(t, makeEntry({ kind: 'lyrics', rating: 1, text: '같은 가사', context: { ref: 'l1', section: 'Verse' } }));
  addEntry(t, makeEntry({ kind: 'lyrics', rating: -1, text: '같은 가사 ', context: { ref: 'l2', section: 'Verse' } }));
  assert.ok(!preferencePairs(t).some((p) => p.source === 'rating' && p.chosen.trim() === p.rejected.trim()), '같은 글끼리는 쌍이 아님');
  addEntry(t, makeEntry({ kind: 'melody', rating: -1, text: 'Chorus 1: 불2 꺼2 진2', context: { ref: 'm2', section: 'Chorus' } }));
  const mel = preferencePairs(t).filter((p) => p.source === 'rating' && p.kind === 'melody');
  assert.equal(mel.length, 1);
  assert.notEqual(mel[0].chosen, mel[0].rejected);
  console.log('melody feedback OK');
}
