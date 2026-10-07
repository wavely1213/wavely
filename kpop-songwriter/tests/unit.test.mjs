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

// 새 리듬: 뎀보(스네어 3·6·11·14칸)·펑크 드럼, 엇박 하우스 베이스(뒷박만)
{
  const { normalizeMusic } = await import('../src/js/music/arrangement.js');
  const { buildTimeline } = await import('../src/js/music/timeline.js');
  const { exampleSong } = await import('../src/js/example.js');
  const { DRUM_PATTERNS, BASS_PATTERNS } = await import('../src/js/music/patterns.js');
  assert.ok(DRUM_PATTERNS.dembow && DRUM_PATTERNS.funk && BASS_PATTERNS.offbeat);
  const song = normalizeMusic(exampleSong());
  const sec = song.sections.find((s) => s.type === 'Verse');
  Object.assign(song.music.sections[sec.id], { drum: 'dembow', bass: 'offbeat', energy: 3, instruments: ['drums', 'bass'], drumGrid: null });
  const tl = buildTimeline(song, [sec.id]);
  const bar0 = (inst, note) => tl.events.filter((e) => e.inst === inst && (!note || e.note === note) && e.step < 16).map((e) => e.step).sort((a, b) => a - b);
  assert.deepEqual(bar0('drums', 'snare'), [3, 6, 11, 14]);
  assert.deepEqual(bar0('bass'), [2, 6, 10, 14]);
  console.log('patterns OK');
}

// 코드 진행 추가: 시티팝(장조, 7th), 안달루시안(단조)
{
  const { findProgression } = await import('../src/js/music/theory.js');
  assert.equal(findProgression('major', [4, 3, 6, 1]).id, 'citypop');
  assert.equal(findProgression('major', [4, 3, 6, 1]).seventh, true);
  assert.equal(findProgression('minor', [1, 7, 6, 5]).id, 'descend');
  console.log('progressions OK');
}
