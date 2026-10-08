// 가사 채점 점검: 좋은 코러스 > 나쁜 코러스, 고칠 점 문구, 반복 섹션 제외, 곡 단위 점검. 실행: npm run test:optimize
import assert from 'node:assert/strict';
import { scoreSection, scoreSong } from '../src/js/optimize/lyricscore.js';
import { exampleSong } from '../src/js/example.js';
import { parseSimilarity, similarityStatus, replaceLine } from '../src/js/optimize/similarity.js';

const good = scoreSection({ type: 'Chorus', text: 'Midnight signal 너를 불러\n새벽 세 시 너를 불러\nMidnight signal 들리니 너\n꺼지지 않아 이 불빛 너' });
const bad = scoreSection({ type: 'Chorus', text: '안녕하세요 반갑습니다 오늘 날씨가 정말 좋네요 그렇죠\n음' });
assert.ok(good.score >= 85, `좋은 코러스 ${good.score}`);
assert.ok(bad.score <= 40, `나쁜 코러스 ${bad.score}`);
assert.ok(bad.tips.some((t) => t.includes('훅')));
assert.ok(bad.tips.some((t) => t.includes('음절')));
assert.equal(scoreSection({ type: 'Intro', text: '(oh)' }), null, '인트로는 채점하지 않음');
assert.equal(scoreSection({ type: 'Verse', text: '' }).score, 0);

const rapWeak = scoreSection({ type: 'Rap', text: '하나 둘 셋 넷 다섯 여섯 일곱 여덟\n바다 위로 날아가는 새를 봤어\n오늘은 기분이 좋은 날이야 진짜\n내일도 그럴 거라고 믿고 싶다' });
const rapStrong = scoreSection({ type: 'Rap', text: '삐삐 소리처럼 짧게 또 길게 비밀\n모스 부호로 적은 내 마음 속 비밀\n답이 없어도 난 안 멈춰 이제 비밀\nSignal on 내 방은 너의 위성 비밀' });
assert.ok(rapStrong.score > rapWeak.score, '라임 촘촘한 랩이 더 높다');

const song = exampleSong();
const r = scoreSong(song);
assert.ok(r.score > 60 && r.score <= 100);
assert.equal(r.sections.find((s) => s.label === 'Chorus 2').result, null, '비워 둔 반복 코러스는 채점 안 함');
song.concept.koRatio = 30;
assert.ok(scoreSong(song).tips.some((t) => t.includes('한국어 비율')));

// 유사 표현 점검: 가사에 실제로 있는 줄만, 띄어쓰기·대소문자 무시, 중복 제거, 상태 변화
const sim = { title: 't', sections: [{ type: 'Verse', text: '불 꺼진 거리 위\nI keep on calling' }, { type: 'Chorus', text: 'Midnight signal 들리니\n같은 줄' }, { type: 'Chorus', text: '' }] };
assert.equal(similarityStatus(sim), 'none');
const parsed = parseSimilarity({ summary: '요약', items: [
  { line: 'i keep  on calling', like: 'A - B', why: '훅이 같음', level: 'high', fix: 'I keep on signaling' },
  { line: '없는 줄', like: 'C', why: 'x', level: 'check', fix: 'y' },
  { line: 'I keep on calling', like: 'dup', why: '', level: 'check' },
  { line: 'Midnight signal', like: 'D', why: '부분', level: 'weird', fix: '' },
] }, sim);
assert.deepEqual(parsed.items.map((i) => [i.line, i.level]), [['I keep on calling', 'high'], ['Midnight signal 들리니', 'check']]);
sim.similarity = parsed;
assert.equal(similarityStatus(sim), 'flagged');
parsed.items.forEach((i) => { i.ok = true; });
assert.equal(similarityStatus(sim), 'clear');
assert.equal(replaceLine(sim, 'Midnight signal 들리니', 'Midnight signal 받았니'), 1, '비운 반복 코러스는 원본만 바뀜');
assert.ok(sim.sections[1].text.startsWith('Midnight signal 받았니'));
assert.equal(similarityStatus(sim), 'stale', '가사가 바뀌면 다시 점검');
console.log('similarity OK');

// 맞춤법: 가사에 있는 줄만, 고친 줄이 같으면 버림, 상태
{
  const { parseSpelling, spellingStatus } = await import('../src/js/optimize/spelling.js');
  const sp = { sections: [{ type: 'Verse', text: '할수 있어\n괜찮아' }] };
  assert.equal(spellingStatus(sp), 'none');
  const r = parseSpelling({ items: [
    { line: '할수 있어', fixed: '할 수 있어', why: '띄어쓰기' },
    { line: '괜찮아', fixed: '괜찮아' },
    { line: '없는 줄', fixed: 'x' },
    { line: '할수  있어', fixed: '중복' },
    { line: '괜찮', fixed: '괜찬' },
  ] }, sp);
  assert.deepEqual(r.items.map((i) => [i.line, i.fixed]), [['할수 있어', '할 수 있어']], '줄 일부만 짚은 것은 버림 (바꾸면 단어가 사라짐)');
  sp.spelling = r;
  assert.equal(spellingStatus(sp), 'flagged');
  r.items[0].ok = true;
  assert.equal(spellingStatus(sp), 'clear');
  console.log('spelling OK');
}

// 채점 기준 보정: 줄이 적으면 기본값, 쌓이면 내 가사 길이 쪽으로 (기본값과 섞어서), 끄면 기본값
const { syllableRanges, cachedRanges, lyricSamples } = await import('../src/js/optimize/calibrate.js');
const longLine = '가나다라마바사아자차카타파하가나'; // 16음절
const mk = (n, type = 'Verse') => Array.from({ length: n }, (_, i) => ({ id: `e${i}`, at: i, kind: 'lyrics', rating: i % 2 ? 1 : 0, text: longLine, after: longLine, context: { section: type } }));
assert.deepEqual(syllableRanges({ log: mk(7) }), {}, '7줄은 보정 안 함');
assert.equal(lyricSamples({ log: [{ kind: 'lyrics', rating: -1, text: 'x', context: { section: 'Verse' } }, { kind: 'hook', rating: 1, text: 'x', context: { section: 'Verse' } }] }).length, 0, '👎·다른 종류는 안 씀');
const r16 = syllableRanges({ log: mk(16) });
assert.deepEqual(r16.Verse.own, [16, 16]);
assert.equal(r16.Verse.n, 16);
assert.deepEqual(r16.Verse.range, [12, 15], '16줄이면 기본값(7~13)과 반반');
const r64 = syllableRanges({ log: mk(64) });
assert.ok(r64.Verse.range[0] > r16.Verse.range[0], '많이 쌓일수록 내 가사 쪽으로');
const verse16 = { type: 'Verse', text: Array(4).fill(longLine).join('\n') };
assert.ok(scoreSection(verse16, {}).tips.some((t) => t.includes('7~13음절') && !t.includes('내 취향')), '기본값으로는 길다고 함');
assert.ok(!scoreSection(verse16, r64).tips.some((t) => t.startsWith('줄 길이')), '내 기준으로는 괜찮음');
assert.ok(scoreSection(verse16, r64).score > scoreSection(verse16, {}).score);
const tasteOn = { enabled: true, log: mk(20) };
assert.equal(cachedRanges(tasteOn), cachedRanges(tasteOn), '같은 기록이면 다시 계산 안 함');
assert.deepEqual(cachedRanges({ ...tasteOn, enabled: false }), {}, '취향 반영을 끄면 기본값');
console.log('calibrate OK');
console.log('optimize OK');
