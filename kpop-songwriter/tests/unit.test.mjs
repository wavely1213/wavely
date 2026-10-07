// 순수 함수 점검: 음절·라임, Suno 내보내기, 파트 분배. 실행: npm run test:unit
import assert from 'node:assert/strict';
import { countSyllables, rhymeKey, analyzeSection, languageRatio } from '../src/js/lyrictools.js';
import { buildLyrics, buildStyle } from '../src/js/suno.js';
import { exampleSong } from '../src/js/example.js';
import { autoDistribute, sectionLabels } from '../src/js/structure.js';
console.log(countSyllables('불 꺼진 거리 위 혼자 깨어 있어'), countSyllables('Midnight signal 너를 불러 (oh)'));
console.log(rhymeKey('휴대폰 화면엔 네 이름만 떠'), rhymeKey('보내지 못한 말 별처럼 쌓여'), rhymeKey('I keep on calling'));
console.log(analyzeSection('불 꺼진 거리 위 혼자 깨어 있어\n휴대폰 화면엔 네 이름만 떠').map(r=>[r.syllables,r.key,r.group]));
const s = exampleSong();
console.log(sectionLabels(s.sections).join(' | '));
console.log(languageRatio(s.sections.map(x=>x.text).join('\n')));
console.log(buildLyrics(s,{memberTags:true,keepAdlibs:false}).slice(0,300));
console.log(buildStyle(s.style));
console.log(autoDistribute(s.sections, s.members).map(x=>x.members.length).join(','));

assert.equal(countSyllables('불 꺼진 거리 위 혼자 깨어 있어'), 12);
assert.equal(rhymeKey('보내지 못한 말 별처럼 쌓여'), 'eo');
assert.match(buildLyrics(s, { keepAdlibs: true }), /\[Chorus 2\]\nMidnight signal/);
console.log('unit OK');

// 줄 단위 비교
{
  const { lineDiff } = await import('../src/js/textdiff.js');
  const d = lineDiff('a\nb\nc\nd', 'a\nc\nx\nd');
  assert.deepEqual(d.map((r) => `${r.type}:${r.text}`), ['same:a', 'del:b', 'same:c', 'add:x', 'same:d']);
  assert.deepEqual(lineDiff('', 'z').map((r) => r.type), ['del', 'add'], '빈 줄 → z');
  assert.ok(lineDiff('x\ny', 'x\ny').every((r) => r.type === 'same'));
  console.log('diff OK');
}

// 부를 음절 조각: 한글은 글자마다, 영어는 음절 수만큼, 괄호 애드립 제외 — 개수는 countSyllables와 같음
{
  const { syllableTokens, countSyllables } = await import('../src/js/lyrictools.js');
  const line = '불 꺼진 signal (oh) baby calling';
  assert.deepEqual(syllableTokens(line), ['불', '꺼', '진', 'sig', 'nal', 'ba', 'by', 'call', 'ing']);
  for (const l of ['Midnight signal 들리니', '새벽 세 시 빛이 번져', 'I keep on calling', '(Can you hear me?)']) assert.equal(syllableTokens(l).length, countSyllables(l), l);
  console.log('tokens OK');
}

// 멜로디 글 표기: 시작 순서, 4칸 이상 쉼은 /, 긴 음은 ~, 음절 없으면 ·
{
  const { melodyText } = await import('../src/js/music/melodytext.js');
  assert.equal(melodyText([{ s: 8, l: 2, d: 3, syl: '꺼' }, { s: 0, l: 2, d: 2, syl: '불' }, { s: 10, l: 6, d: 5, syl: '진' }, { s: 24, l: 2, d: 1, syl: '' }]), '불2 / 꺼3 진5~ / ·1');
  assert.equal(melodyText([]), '');
  console.log('melodytext OK');
}
