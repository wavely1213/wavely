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
