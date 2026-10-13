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
  const { melodyFeedbackText } = await import('../src/js/music/melodytext.js');
  assert.equal(melodyFeedbackText('Chorus 1', [{ s: 0, l: 2, d: 4, syl: '불' }, { s: 2, l: 2, d: 5, syl: '꺼' }, { s: 4, l: 6, d: 7, syl: '진' }]), 'Chorus 1: 불4 꺼5 진7~');
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

// 코드 진행 프리셋: 예전 id는 그대로 (저장된 곡·기본값), 국내 흔한 진행 추가, 같은 조에서 도수가 겹치지 않음
{
  const { findProgression, PROGRESSIONS, isChord } = await import('../src/js/music/theory.js');
  assert.equal(findProgression('major', [4, 3, 6, 1]).id, 'citypop');
  assert.equal(findProgression('major', [4, 3, 6, 1]).seventh, true);
  assert.equal(findProgression('minor', [1, 7, 6, 5]).id, 'descend');
  assert.equal(findProgression('major', [4, 5, 3, 6, 2, 5, 1, 1]).id, 'royal8');
  assert.equal(findProgression('major', [4, 2, 3, 6]).seventh, true, '4236은 7th');
  assert.equal(findProgression('minor', [6, 7, 1, 3]).id, 'rise_m');
  assert.equal(findProgression('minor', [1, 6]).id, 'trap', '도수를 바꾸지 않아 저장된 곡의 이름이 남음');
  assert.ok([...PROGRESSIONS.major, ...PROGRESSIONS.minor].every((p) => !p.name.includes('머니코드')), '머니코드는 출처마다 달라 이름에 안 씀');
  for (const mode of ['major', 'minor']) {
    const list = PROGRESSIONS[mode];
    assert.equal(new Set(list.map((p) => p.degrees.join())).size, list.length, `${mode} 도수 중복 없음`);
    assert.equal(new Set(list.map((p) => p.id)).size, list.length, `${mode} id 중복 없음`);
    assert.ok(list.every((p) => p.use && p.degrees.length >= 1 && p.degrees.length <= 8 && p.degrees.every(isChord)), `${mode} 칩·AI 범위 안`);
  }
  ['hope', 'emotional', 'royal', 'dreamy', 'build', 'ballad', 'simple', 'citypop'].forEach((id) => assert.ok(PROGRESSIONS.major.some((p) => p.id === id), id));
  ['dark', 'sad', 'epic', 'build', 'trap', 'mystic', 'descend'].forEach((id) => assert.ok(PROGRESSIONS.minor.some((p) => p.id === id), id));
  console.log('progressions OK');
}

// Suno 스타일 '한국어로 부름' 표시 (국내판): 한국어 비율 50% 이상이면 장르 바로 뒤, 이미 적혀 있거나 칸이 비면 붙이지 않음
{
  const { koreanTag, sunoStyle } = await import('../src/js/suno.js');
  const st = { genre: 'K-pop dance pop', subgenre: 'dreamy synth-pop', bpm: 120, key: '', vocals: 'airy female group vocals' };
  assert.equal(koreanTag(40), '');
  assert.equal(koreanTag(70), 'sung in Korean, Korean lyrics with English hook');
  assert.equal(koreanTag(90), 'sung in Korean, Korean lyrics');
  assert.equal(buildStyle(st, { koRatio: 70 }), 'K-pop dance pop, sung in Korean, Korean lyrics with English hook, dreamy synth-pop, 120 BPM, airy female group vocals');
  assert.equal(buildStyle(st), 'K-pop dance pop, dreamy synth-pop, 120 BPM, airy female group vocals', '비율을 안 주면 (번안판) 붙이지 않음');
  assert.equal(buildStyle({ ...st, vocals: 'Korean female vocals' }, { koRatio: 100 }), 'K-pop dance pop, dreamy synth-pop, 120 BPM, Korean female vocals');
  assert.equal(buildStyle({ genre: '', bpm: '' }, { koRatio: 80 }), '');
  assert.match(buildStyle({ genre: 'Korean ballad' }, { koRatio: 95 }), /^Korean ballad, sung in Korean, Korean lyrics$/);
  assert.match(buildStyle({ genre: 'Korean R&B with soulful vocals' }, { koRatio: 95 }), /sung in Korean/, '장르 이름은 언어 표시가 아님');
  assert.match(buildStyle({ genre: 'Korean indie band', production: 'Korean indie band sound with gang vocals' }, { koRatio: 95 }), /sung in Korean/);
  assert.doesNotMatch(buildStyle({ genre: 'K-pop', vocals: 'female vocals in Korean' }, { koRatio: 95 }), /sung in Korean/, '이미 밝혀 둠');
  assert.doesNotMatch(buildStyle({ genre: 'K-pop', vocals: 'Korean female group vocals' }, { koRatio: 95 }), /sung in Korean/);
  assert.doesNotMatch(buildStyle({ genre: 'K-pop', vocals: 'Korean rap' }, { koRatio: 95 }), /sung in Korean/);
  assert.doesNotMatch(sunoStyle({ instOf: 'x', concept: { koRatio: 95 }, style: st }), /sung in Korean/, 'Inst. 버전은 안 부름');
  const song = { concept: { koRatio: 95 }, style: st };
  assert.equal(sunoStyle(song), buildStyle(st, { koRatio: 95 }));
  assert.equal(sunoStyle(song, { genre: 'K-pop R&B' }), 'K-pop R&B, sung in Korean, Korean lyrics', '변형 스타일에도 붙음');
  console.log('suno korean OK');
}

// 국내 기준 AI 규칙: 훅 언어 비율, 프리셋 목록
{
  const { hookRule, presetBrief, lyricRules, setExplicitGetter } = await import('../src/js/ai-rules.js');
  assert.match(hookRule(95), /영어 훅은 많아야 1개/);
  assert.doesNotMatch(hookRule(70), /많아야 1개/);
  assert.match(hookRule(70), /한국어 훅을 4개 안팎/);
  assert.match(hookRule(30), /한국어 훅을 2개 안팎/);
  const r80 = lyricRules({ id: 'a', concept: { koRatio: 80 } });
  assert.ok(r80.includes('영어는 전체의 약 20%') && r80.includes('벌스와 프리코러스는 한국어로') && r80.includes('KBS 기준'));
  const r40 = lyricRules({ id: 'a', concept: { koRatio: 40 } });
  assert.ok(r40.includes('영어는 전체의 약 60%') && !r40.includes('벌스와 프리코러스는 한국어로') && r40.includes('벌스·프리코러스에 짧은 구절로'), '낮은 비율은 벌스에도 영어');
  setExplicitGetter((id) => id === 'x');
  const rx = lyricRules({ id: 'x', concept: { koRatio: 70 } });
  assert.ok(rx.includes('19금(Explicit)') && !rx.includes('KBS 기준'), '19금 트랙은 심의 제한 없음');
  setExplicitGetter(() => false);
  assert.match(presetBrief(), /4536 왕도 \(4536\)|두근두근 고조 \(4536 왕도\) \[4,5,3,6\]/);
  assert.match(presetBrief(), /\[4,2,3,6\]\+7th/);
  console.log('ai rules OK');
}

// 분:초 표시·입력 (마스터링 곡 끝 자르기)
import { mmss, parseMmss } from '../src/js/timefmt.js';
{
  assert.equal(parseMmss('3:25'), 205);
  assert.equal(parseMmss(' 3:25.5 '), 205.5);
  assert.equal(parseMmss('205'), 205);
  assert.equal(parseMmss('0：20'), 20);
  assert.equal(parseMmss(''), 0);
  assert.ok(Number.isNaN(parseMmss('9:99')));
  assert.ok(Number.isNaN(parseMmss('abc')));
  assert.ok(Number.isNaN(parseMmss('1:2:3')));
  assert.equal(mmss(205), '3:25');
  assert.equal(mmss(205.5, { tenths: true }), '3:25.5');
  assert.equal(mmss(65.04, { tenths: true }), '1:05');
  assert.equal(mmss(5.5, { tenths: true }), '0:05.5');
  console.log('timefmt OK');
}

// 멤버 불러오기: 같은 구성은 최근 곡 하나만, 새 id, 파트가 비어 있으면 자동 분배
import { memberSources, importMembers } from '../src/js/members.js';
{
  const mem = (id, name, position) => ({ id, name, position, tone: '', voice: '' });
  const A = { id: 'A', title: '예시: 첫 곡', updatedAt: 3, concept: { group: 'boy' }, members: [mem('a1', '준', '메인보컬'), mem('a2', '하늘', '메인래퍼')] };
  const B = { id: 'B', title: '옛 곡', updatedAt: 1, concept: { group: 'boy' }, members: [mem('b1', '준', '메인보컬'), mem('b2', '하늘', '메인래퍼')] };
  const D = { id: 'D', title: '솔로', updatedAt: 2, concept: { group: 'solo-f' }, members: [mem('d1', '유나', '메인보컬')] };
  const C = { id: 'C', title: '새 곡', updatedAt: 4, concept: { group: 'girl' }, members: [], sections: [{ id: 's1', type: 'Verse', members: [], text: '가' }, { id: 's2', type: 'Chorus', members: [], text: '나' }, { id: 's3', type: 'Rap', members: [], text: '다' }] };
  const list = memberSources([A, B, C, D], C);
  assert.deepEqual(list.map((x) => x.id), ['A', 'D']);
  assert.equal(list[0].label, '첫 곡 — 준·하늘');
  importMembers(C, A);
  assert.deepEqual(C.members.map((m) => m.name), ['준', '하늘']);
  assert.ok(C.members.every((m) => m.id !== 'a1' && m.id !== 'a2'));
  assert.equal(C.concept.group, 'boy');
  const [v, ch, rap] = C.sections;
  assert.equal(ch.members.length, 2, '코러스는 전원');
  assert.deepEqual(rap.members, [C.members[1].id], '랩은 래퍼');
  assert.deepEqual(v.members, [C.members[0].id]);
  assert.equal(v.text, '가', '가사는 그대로');
  console.log('member import OK');
}

// 저장 공간 사용량·꽉 참 오류 알아보기
import { storageUsage, isQuotaError, LOCAL_LIMIT, WEBKIT_LIMIT, isWebKit, limitFor } from '../src/js/storage-usage.js';
{
  const data = { ab: 'x'.repeat(98), c: '' };
  const fake = { get length() { return Object.keys(data).length; }, key: (i) => Object.keys(data)[i], getItem: (k) => data[k] };
  const u = storageUsage(fake);
  assert.equal(u.used, 2 + 98 + 1);
  assert.equal(storageUsage(fake, LOCAL_LIMIT).ratio, 101 / LOCAL_LIMIT);
  assert.equal(storageUsage(fake, WEBKIT_LIMIT).ratio, 101 / WEBKIT_LIMIT);
  // WebKit 알아보기: 맥 Safari·iPhone(크롬 포함)·데스크톱 모드 iPad는 WebKit, 크롬·엣지·안드로이드·파이어폭스는 아님
  const UA = {
    macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1',
    macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0',
    android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  };
  assert.deepEqual(Object.values(UA).map((ua) => isWebKit(ua, 0)), [true, true, false, false, false, false]);
  assert.equal(isWebKit(UA.macSafari, 5), true, '데스크톱 모드 iPad');
  assert.equal(limitFor(UA.iphoneChrome, 5), WEBKIT_LIMIT);
  assert.equal(limitFor(UA.android, 5), LOCAL_LIMIT);
  assert.equal(storageUsage(null), null);
  assert.equal(storageUsage({ get length() { throw new Error('blocked'); } }), null);
  assert.ok(isQuotaError({ name: 'QuotaExceededError' }));
  assert.ok(isQuotaError({ name: 'Error', code: 22 }));
  assert.ok(isQuotaError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' }));
  assert.ok(isQuotaError(new Error('Quota exceeded for this origin')));
  assert.ok(!isQuotaError(new Error('network')));
  assert.ok(!isQuotaError(null));
  console.log('storage usage OK');
}

// 가사·마디 맞춤: 초당 음절로 빠듯함·느슨함 (애드립 제외, 랩은 더 빠르게)
import { lyricFit } from '../src/js/lyricfit.js';
{
  const line = '가나다라마바사아'; // 8음절
  const many = Array(8).fill(line).join('\n'); // 64음절
  // 120 BPM 4마디 = 8초 → 초당 8음절: 노래는 빠듯, 랩은 괜찮음
  assert.equal(lyricFit(many, { bars: 4, bpm: 120, type: 'Verse' }).level, 'tight');
  assert.equal(lyricFit(many, { bars: 4, bpm: 120, type: 'Rap' }).level, 'ok');
  assert.equal(lyricFit(many, { bars: 8, bpm: 120, type: 'Verse' }).level, 'ok');
  // 8마디(16초)에 8음절 = 초당 0.5: 코러스는 느슨, 아웃트로는 안내 안 함
  assert.equal(lyricFit(line, { bars: 8, bpm: 120, type: 'Chorus' }).level, 'loose');
  assert.equal(lyricFit(line, { bars: 8, bpm: 120, type: 'Outro' }).level, 'ok');
  assert.equal(lyricFit('(Oh yeah)\n(woo)', { bars: 4, bpm: 120, type: 'Verse' }), null, '애드립만 있으면 판단 안 함');
  assert.equal(lyricFit(many, { bars: 0, bpm: 120, type: 'Verse' }), null);
  const f = lyricFit(many, { bars: 4, bpm: 120, type: 'Verse' });
  assert.equal(f.syl, 64);
  assert.equal(f.seconds, 8);
  assert.ok(f.tip.includes('4마디(8.0초)에 64음절') && f.label.includes('초당 8.0음절'));
  console.log('lyric fit OK');
}

// 곡 길이 예상: 마디 합 × 4박 / BPM, 길거나 짧으면 안내
import { songLength, lengthNote } from '../src/js/music/length.js';
{
  // 편곡 정보가 없는 섹션은 재생과 같이 4마디로 친다
  const song = { music: { bpm: 120, sections: { a: { bars: 40 }, b: { bars: 44 } } }, sections: [{ id: 'a' }, { id: 'b' }, { id: 'new' }] };
  assert.deepEqual(songLength(song), { bars: 88, seconds: 176 });
  assert.equal(lengthNote(songLength(song)), '편곡 기준 길이 2:56 (88마디)');
  assert.ok(lengthNote(songLength(song, 80)).includes('길어요'), '80 BPM이면 4:24');
  assert.ok(lengthNote({ bars: 40, seconds: 80 }).includes('짧아요'));
  assert.ok(!lengthNote({ bars: 70, seconds: 140 }).includes('짧아요'), '기본 구조(표준 템플릿 70마디, 2:20)는 경고 없음');
  assert.equal(lengthNote({ bars: 0, seconds: 0 }), '');
  assert.ok(lengthNote({ bars: 48, seconds: 97.6 }).startsWith('편곡 기준 길이 1:38'), '재생 막대(반올림)와 같은 표시');
  console.log('song length OK');
}

// 파트 분배: 비워 둔 반복 코러스도 다시 부르는 것으로, 같이 부르는 섹션은 나눠서, 음절(애드립 제외) 기준도
import { lineShare, syllableShare } from '../src/js/structure.js';
{
  const members = [{ id: 'a' }, { id: 'b' }];
  const sections = [
    { type: 'Verse', members: ['a'], text: '가나다라\n마바사아 (oh)' }, // 2줄 8음절
    { type: 'Chorus', members: ['a', 'b'], text: '자차카타' }, // 1줄 4음절, 반씩
    { type: 'Verse', members: ['b'], text: '가나' }, // 1줄 2음절
    { type: 'Chorus', members: ['b'], text: '' }, // 앞 코러스 다시: 1줄 4음절 → b
  ];
  assert.deepEqual(lineShare(sections, members), { a: 2.5, b: 2.5 });
  assert.deepEqual(syllableShare(sections, members), { a: 10, b: 8 });
  console.log('part share OK');
}

// 같은 멜로디 맞추기: 둘째 벌스를 첫 벌스와 줄 수·줄마다 음절(±2)로 비교, 애드립 줄은 빼고, 브릿지 등은 안 봄
import { matchFirst, matchNote } from '../src/js/lyricmatch.js';
{
  const sec = (type, text) => ({ type, text });
  const sections = [
    sec('Verse', '가나다라마바\n가나다라마바사아\n(oh)'),
    sec('Chorus', '훅 훅'),
    sec('Verse', '가나다라마바\n가나다\n가나다라마\n(yeah)'),
    sec('Bridge', '하나'),
    sec('Bridge', '하나 둘 셋 넷 다섯 여섯'),
  ];
  const m = matchFirst(sections, 2);
  assert.equal(m.ref, 0);
  assert.deepEqual(m.lines, [{ n: 2, have: 3, want: 8 }]);
  assert.deepEqual([m.countHave, m.countWant], [3, 2]);
  assert.equal(matchNote(m, 'Verse 1'), 'Verse 1의 멜로디로 부르려면 맞춰 보세요: 줄 수 3줄 (Verse 1 2줄) · 2번째 줄 3음절(8)');
  assert.equal(matchFirst(sections, 0), null, '첫 벌스는 비교 대상 없음');
  assert.equal(matchFirst(sections, 4), null, '브릿지는 안 봄');
  assert.equal(matchNote(matchFirst(sections, 2, '가나다라마바\n가나다라마바사'), 'Verse 1'), '', '±2 안이면 안내 없음');
  // 줄 번호는 가사 칸의 실제 줄 (애드립 줄이 앞에 있어도)
  assert.deepEqual(matchFirst(sections, 2, '(yeah)\n가나다라마바\n가나다').lines, [{ n: 3, have: 3, want: 8 }]);
  console.log('lyric match OK');
}

// 반복 섹션 멜로디: 같은 가사(비워 둔 반복 포함)는 첫 섹션 것만 AI에 맡기고 멜로디를 옮긴다
{
  const { melodyPlan, applyCopies, copyMelody, repeatSource, sungKey } = await import('../src/js/music/melodycopy.js');
  const { sungText } = await import('../src/js/structure.js');
  const { exampleSong } = await import('../src/js/example.js');
  const { normalizeMusic } = await import('../src/js/music/arrangement.js');
  const { buildTimeline } = await import('../src/js/music/timeline.js');
  const song = normalizeMusic(exampleSong());
  const ch = song.sections.filter((x) => x.type === 'Chorus');
  const plan = melodyPlan(song.sections);
  assert.deepEqual(plan.targets, song.sections.filter((x) => x.text.trim()).map((x) => x.id), '가사 있는 섹션은 모두 대상');
  assert.deepEqual(plan.copies, [{ from: ch[0].id, to: ch[1].id, emptyText: true }]);
  assert.equal(sungText(song.sections, song.sections.indexOf(ch[1])), ch[0].text);
  const lead = (s) => buildTimeline(s, [ch[1].id]).events.filter((e) => e.inst === 'lead').length;
  const before = lead(song);
  assert.equal(repeatSource(song, song.sections.indexOf(ch[1])), song.sections.indexOf(ch[0]));
  assert.deepEqual(applyCopies(song, plan, [ch[0].id]), [ch[1].id]);
  const m1 = song.music.sections[ch[0].id].melody;
  const m2 = song.music.sections[ch[1].id].melody;
  assert.deepEqual(m2, m1, 'Chorus 2가 Chorus 1 멜로디를 받음');
  assert.notEqual(m2[0], m1[0], '복사본 (한쪽을 고쳐도 다른 쪽은 그대로)');
  assert.ok(lead(song) > before, `데모에서 Chorus 2 멜로디가 울림 (${before} → ${lead(song)})`);
  // '전부'를 다시 돌려 Chorus 1이 바뀌면, 손대지 않은 예전 복사본은 새 멜로디로
  song.music.sections[ch[0].id].melody = [{ s: 0, l: 4, d: 5, syl: 'Mid' }];
  assert.deepEqual(applyCopies(song, plan, [ch[0].id]), [ch[1].id]);
  assert.deepEqual(song.music.sections[ch[1].id].melody, [{ s: 0, l: 4, d: 5, syl: 'Mid' }]);
  // 비워 둔 반복에 손으로 찍거나 고친 음표가 있으면 두고, 가사를 따로 적은 반복은 덮는다
  song.music.sections[ch[1].id].melody = [{ s: 0, l: 2, d: 1, syl: '' }];
  assert.deepEqual(applyCopies(song, plan, [ch[0].id]), []);
  assert.equal(song.music.sections[ch[1].id].melody.length, 1);
  // 마디가 짧으면 잘림
  assert.deepEqual(copyMelody([{ s: 0, l: 4 }, { s: 60, l: 8 }, { s: 70, l: 2 }], 4), [{ s: 0, l: 4 }, { s: 60, l: 4 }]);
  // 빈칸·빈 줄만 다른 같은 가사는 같은 묶음, 가사가 다른 코러스는 따로
  const secs = [
    { id: 'a', type: 'Chorus', text: '하나\n둘' },
    { id: 'b', type: 'Chorus', text: '  하나\n\n둘 ' },
    { id: 'c', type: 'Chorus', text: '셋' },
    { id: 'd', type: 'Verse', text: '하나\n둘' },
    { id: 'e', type: 'Dance Break', text: '' },
  ];
  assert.equal(sungKey(secs, 0), sungKey(secs, 1));
  assert.equal(sungKey(secs, 4), '');
  const p2 = melodyPlan(secs);
  assert.deepEqual(p2.targets, ['a', 'c', 'd']);
  assert.deepEqual(p2.copies, [{ from: 'a', to: 'b', emptyText: false }]);
  console.log('melody copy OK');
}

// 장르 묶음별 섹션 기본값 (D-022): 장르 칸·분위기 → 묶음, 묶음 → 섹션 코드·드럼·베이스·에너지·7th
{
  const { songGenre, templateStyleGenre, GENRE_PROFILES, fitBpm, tempoRange } = await import('../src/js/music/genres.js');
  const { defaultSectionMusic, applyGenreDefaults, applyTemplateDefaults, normalizeMusic: norm } = await import('../src/js/music/arrangement.js');
  const { PROGRESSIONS, findProgression } = await import('../src/js/music/theory.js');
  const { DRUM_PATTERNS, BASS_PATTERNS } = await import('../src/js/music/patterns.js');
  const { ARRANGE_INSTRUMENTS } = await import('../src/js/music/instruments.js');
  const { SECTION_TYPES, GENRES } = await import('../src/js/constants.js');
  const g = (genre, moods = [], subgenre = '') => songGenre({ style: { genre, subgenre }, concept: { moods } });
  // 앱 장르 목록 매핑 (genre-chords 3-2)
  const want = { 'K-pop dance pop': 'bright', 'K-pop EDM': 'dark', 'K-pop hip hop': 'dark', 'K-pop R&B': 'rnb', 'K-pop ballad': 'ballad', 'Korean ballad': 'ballad', 'synth-pop': 'bright',
    'UK garage': 'club', 'Jersey club': 'club', Afrobeats: 'club', house: 'club', 'pop rock': 'band', moombahton: 'club' };
  GENRES.forEach((x) => assert.equal(g(x).id, want[x], x));
  assert.equal(g('K-pop dance pop', ['걸크러시']).id, 'dark', '분위기 걸크러시·다크 → 다크');
  assert.equal(g('K-pop ballad', ['다크']).id, 'ballad', '장르 칸이 먼저');
  assert.equal(g('').id, 'bright', '빈 장르는 청량');
  assert.equal(g('Korean indie band').id, 'band');
  assert.equal(g('K-drama OST ballad').id, 'ballad');
  assert.equal(g('케이팝 발라드').id, 'ballad');
  assert.equal(g('Brazilian funk').id, 'club', '브라질리언 펑크는 클럽');
  assert.equal(g('K-pop', [], 'city pop').id, 'rnb', '세부 장르도 봄');
  assert.equal(g('Jersey club').groove, 'jersey');
  assert.equal(g('UK garage').groove, 'ukg');
  assert.equal(g('garage rock').id, 'band', 'garage rock은 밴드');
  assert.equal(g('드라마틱 댄스 팝').id, 'bright', '드라마틱은 발라드 아님');
  assert.equal(g('UK 개러지').groove, 'ukg');
  assert.equal(g('new jack swing').id, 'rnb');
  assert.equal(g('알엔비').id, 'rnb');
  assert.equal(g('2step').groove, 'ukg');
  assert.equal(g('팝펑크').id, 'band');
  const ss = (genre) => ({ style: { genre }, concept: { moods: [] } });
  assert.equal(templateStyleGenre('ballad', ss('K-pop dance pop')), 'K-pop ballad');
  assert.equal(templateStyleGenre('ballad', ss('K-pop R&B')), null, 'R&B 곡은 R&B 미디엄 그대로');
  assert.equal(templateStyleGenre('ballad', ss('K-pop ballad')), null);
  assert.equal(templateStyleGenre('standard', ss('K-pop dance pop')), null);
  // 표가 앱 선택지 안에 있음 (진행 id, 드럼·베이스·악기, 드럼이 있으면 드럼 악기)
  const inst = ARRANGE_INSTRUMENTS.map((i) => i.id);
  for (const [id, p] of Object.entries(GENRE_PROFILES)) {
    for (const type of SECTION_TYPES) {
      const d = p.sections[type];
      assert.ok(d, `${id} ${type}`);
      const ok = (mode, v) => (Array.isArray(v) ? v.length && v.every((x) => x >= 1 && x <= 7) : PROGRESSIONS[mode].some((x) => x.id === v));
      assert.ok(ok('major', d.major) && ok('minor', d.minor), `${id} ${type} 진행`);
      assert.ok(d.drum === 'none' || d.drum === 'groove' || DRUM_PATTERNS[d.drum], `${id} ${type} 드럼`);
      assert.ok(BASS_PATTERNS[d.bass] && d.instruments.every((i) => inst.includes(i)), `${id} ${type} 베이스·악기`);
      assert.ok(d.drum === 'none' || d.instruments.includes('drums'), `${id} ${type} 드럼이 들리게`);
      assert.ok(d.bars >= 1 && d.bars <= 16 && d.energy >= 1 && d.energy <= 5);
    }
  }
  const bright = { id: 'bright' };
  // 청량: 후렴 4536(3화음), 벌스 4236+7th, 인트로는 드럼·베이스로 바로(에너지 3), 아웃트로는 짧은 훅 끝(2마디, 에너지 4)
  const ch = defaultSectionMusic('Chorus', 'major', bright);
  assert.equal(findProgression('major', ch.chords).id, 'royal');
  assert.equal(ch.seventh, false);
  const vs = defaultSectionMusic('Verse', 'major', bright);
  assert.equal(findProgression('major', vs.chords).id, 'lilac');
  assert.equal(vs.seventh, true);
  assert.notEqual(vs.drum, 'pop', '벌스 비트가 서양 팝 기본 비트가 아님');
  const intro = defaultSectionMusic('Intro', 'major', bright);
  assert.ok(intro.energy >= 3 && intro.instruments.includes('drums') && intro.drum !== 'none');
  const outro = defaultSectionMusic('Outro', 'major', bright);
  assert.ok(outro.bars === 2 && outro.energy === 4);
  assert.deepEqual(outro.chords, [5, 1], '짧은 끝은 으뜸화음으로 마침');
  assert.deepEqual(defaultSectionMusic('Outro', 'minor', bright).chords, [7, 1]);
  // 모든 묶음·조·섹션: 진행이 마디보다 길지 않음 (보이는 코드 = 들리는 코드), 아웃트로는 으뜸화음으로 끝남
  for (const id of Object.keys(GENRE_PROFILES)) for (const mode of ['major', 'minor']) for (const type of SECTION_TYPES) {
    const d = defaultSectionMusic(type, mode, { id });
    assert.ok(d.chords.length <= d.bars, `${id} ${mode} ${type} 코드 ${d.chords.length} > 마디 ${d.bars}`);
    if (type === 'Outro') assert.equal(d.chords[d.chords.length - 1], 1, `${id} ${mode} 아웃트로 끝`);
  }
  assert.deepEqual(defaultSectionMusic('Chorus', 'major'), ch, '장르를 안 주면 청량');
  assert.equal(findProgression('minor', defaultSectionMusic('Chorus', 'minor', bright).chords).id, 'epic');
  // 발라드: 모든 섹션 7th, 인트로·벌스는 피아노(드럼 없음), 후렴은 4536 확장 + 발라드 드럼
  const bal = { id: 'ballad' };
  SECTION_TYPES.forEach((type) => assert.equal(defaultSectionMusic(type, 'major', bal).seventh, true, type));
  const bv = defaultSectionMusic('Verse', 'major', bal);
  assert.ok(bv.drum === 'none' && bv.instruments.includes('piano') && !bv.instruments.includes('drums'));
  const bc = defaultSectionMusic('Chorus', 'major', bal);
  assert.ok(findProgression('major', bc.chords).id === 'ballad44m' && bc.drum === 'ballad' && bc.bass === 'long', '발라드 후렴은 4-4m-3-6 (D-025)');
  assert.equal(findProgression('minor', defaultSectionMusic('Chorus', 'minor', bal).chords).id, 'circle_m');
  assert.equal(findProgression('major', defaultSectionMusic('Chorus', 'major', { id: 'rnb' }).chords).id, 'marusa');
  // 다크(단조): 포스트코러스·댄스 브레이크는 원코드, 랩은 i–iv 7th
  const dark = { id: 'dark' };
  assert.deepEqual(defaultSectionMusic('Post-Chorus', 'minor', dark).chords, [1]);
  const dr = defaultSectionMusic('Rap', 'minor', dark);
  assert.ok(findProgression('minor', dr.chords).id === 'vamp_iv' && dr.seventh === true);
  // 클럽: 곡 장르의 리듬을 곡 전체에
  const club = g('Jersey club');
  assert.equal(defaultSectionMusic('Verse', 'minor', club).drum, 'jersey');
  assert.equal(defaultSectionMusic('Chorus', 'minor', { id: 'club', groove: 'ukg' }).drum, 'ukg');
  assert.equal(defaultSectionMusic('Chorus', 'minor', { id: 'club' }).drum, 'four');
  // 빠르기: 범위 밖이면 권장값, 범위 안이면 그대로, 범위 없는 결은 그대로
  assert.equal(fitBpm(120, bal), 72);
  assert.equal(fitBpm(66, bal), 66);
  assert.equal(fitBpm(150, bright), 150);
  assert.equal(fitBpm(72, bright), 120, '발라드 빠르기에서 돌아옴');
  assert.equal(fitBpm(100, g('Jersey club')), 135);
  assert.equal(fitBpm(100, g('UK garage')), 134);
  assert.equal(fitBpm(140, g('house')), 124);
  assert.equal(fitBpm(105, g('Afrobeats')), 105, '아프로는 근거가 없어 그대로');
  assert.equal(fitBpm(108, g('moombahton')), 108);
  assert.equal(fitBpm(112, g('K-pop R&B')), 96);
  assert.equal(fitBpm(118, g('K-pop disco')), 118, '디스코 결은 그대로');
  assert.deepEqual(tempoRange(g('K-pop R&B')).slice(0, 2), [80, 100], '도움말·AI 규칙과 같은 범위');
  // 새 섹션은 곡 장르로 (R&B → 펑크 그루브), 이미 있는 섹션 편곡은 그대로
  const song = { sections: [{ id: 'a', type: 'Verse', members: [], text: '' }], style: { genre: 'K-pop R&B' }, concept: { moods: [] } };
  norm(song);
  assert.equal(song.music.sections.a.drum, 'funk');
  song.style.genre = 'K-pop ballad';
  song.sections.push({ id: 'b', type: 'Chorus', members: [], text: '' });
  norm(song);
  assert.equal(song.music.sections.a.drum, 'funk', '있던 섹션은 안 바뀜');
  assert.equal(song.music.sections.b.drum, 'ballad');
  // 버튼: 마디·멜로디는 그대로, 나머지는 장르 기본값, 빠르기는 범위 밖일 때만
  song.music.sections.a.bars = 6;
  song.music.sections.a.melody = [{ s: 0, l: 4, d: 2, syl: '가' }];
  song.music.sections.a.drumGrid = { kick: [] };
  applyGenreDefaults(song);
  assert.equal(song.music.sections.a.bars, 6);
  assert.equal(song.music.sections.a.melody.length, 1);
  assert.equal(song.music.sections.a.drum, 'none');
  assert.equal(song.music.sections.a.drumGrid, null);
  assert.equal(song.music.bpm, 72, '120 → 발라드 권장 72');
  // 버튼: 마디를 그대로 두므로 긴 진행은 그 마디만큼 (4마디 브릿지에 8코드 순환 → 4개)
  const bb = { sections: [{ id: 'g', type: 'Bridge', members: [], text: '' }], style: { genre: 'K-pop dance pop' }, concept: { moods: [] } };
  norm(bb);
  bb.style.genre = 'K-pop ballad';
  applyGenreDefaults(bb);
  assert.deepEqual(bb.music.sections.g.chords, [4, 7, 3, 6]);
  // 발라드 템플릿: 장르 칸을 'K-pop ballad'로 바꿔 뒤에 더하는 섹션·버튼도 발라드, 빠르기도 발라드 범위
  const t2 = { sections: [{ id: 'c', type: 'Chorus', members: [], text: '' }], style: { genre: 'K-pop dance pop', subgenre: 'x' }, concept: { moods: [] } };
  norm(t2);
  t2.sections = [{ id: 'd', type: 'Chorus', members: [], text: '' }];
  applyTemplateDefaults(t2, 'ballad');
  norm(t2);
  assert.ok(t2.music.sections.d.drum === 'ballad' && t2.music.bpm === 72 && !t2.music.sections.c);
  assert.equal(t2.style.genre, 'K-pop ballad');
  assert.equal(t2.style.subgenre, 'x', '세부 장르는 그대로');
  t2.sections.push({ id: 'd2', type: 'Chorus', members: [], text: '' });
  norm(t2);
  assert.equal(t2.music.sections.d2.drum, 'ballad', '뒤에 더한 섹션도 발라드');
  applyGenreDefaults(t2);
  assert.ok(t2.music.sections.d.drum === 'ballad' && t2.music.bpm === 72, '버튼도 발라드');
  const t4 = { sections: [{ id: 'h', type: 'Chorus', members: [], text: '' }], style: { genre: 'K-pop R&B' }, concept: { moods: [] } };
  norm(t4);
  t4.sections = [{ id: 'i', type: 'Chorus', members: [], text: '' }];
  applyTemplateDefaults(t4, 'ballad');
  assert.ok(t4.style.genre === 'K-pop R&B' && t4.music.sections.i.drum === 'funk' && t4.music.bpm === 96, 'R&B는 R&B 미디엄');
  // 다른 템플릿: 곡 장르대로, 빠르기는 범위 밖일 때만 (발라드 빠르기 72 → 댄스 장르로 돌아오면 120)
  const t3 = { sections: [{ id: 'e', type: 'Chorus', members: [], text: '' }], style: { genre: 'K-pop dance pop' }, concept: { moods: [] } };
  norm(t3);
  t3.music.bpm = 135;
  t3.sections = [{ id: 'f', type: 'Chorus', members: [], text: '' }];
  applyTemplateDefaults(t3, 'standard');
  assert.ok(t3.music.sections.f.drum === 'four' && t3.music.bpm === 135, '범위 안 빠르기는 그대로');
  t3.music.bpm = 72;
  t3.sections = [{ id: 'f2', type: 'Chorus', members: [], text: '' }];
  applyTemplateDefaults(t3, 'standard');
  assert.equal(t3.music.bpm, 120);
  // 표준 템플릿 기본 길이: 70마디 (120 BPM 2:20) — length.js 주석·길이 경고 기준과 같음
  const { sectionsFromTemplate } = await import('../src/js/structure.js');
  const std = norm({ sections: sectionsFromTemplate('standard'), style: { genre: 'K-pop dance pop' }, concept: { moods: [] } });
  assert.deepEqual(songLength(std), { bars: 70, seconds: 140 });
  assert.ok(!lengthNote(songLength(std)).includes('짧아요'));
  console.log('genre defaults OK');
}

// AI 편곡이 모르는 드럼·베이스를 주면 곡 장르의 섹션 기본값으로 (예전엔 'pop'·'long')
{
  const { arrangeSong } = await import('../src/js/ai-music.js');
  const { normalizeMusic } = await import('../src/js/music/arrangement.js');
  // ai.js가 처음 받은 sample을 계속 쓰므로, 답은 globalThis.__aiJson으로 바꿔 끼운다 (아래 블록도 같이 씀)
  globalThis.__aiJson = async () => ({ summary: 's', sections: [{ id: 'v', bars: 8, chords: [1, 2], energy: 2, instruments: ['drums'], drum: 'nope', bass: 'nope' }] });
  const fake = Object.assign(async () => ({ text: '' }), { json: (...a) => globalThis.__aiJson(...a) });
  globalThis.window = { claude: { use: async () => fake } };
  const song = normalizeMusic({ title: 't', sections: [{ id: 'v', type: 'Verse', members: [], text: '' }], members: [], references: [], style: { genre: 'K-pop R&B' }, concept: { moods: [], keywords: '', theme: '', story: '', group: 'girl' } });
  const res = await arrangeSong(song, { targetIds: ['v'] });
  assert.equal(res.sections[0].drum, 'funk');
  assert.equal(res.sections[0].bass, 'sync');
  // 발라드 벌스 기본은 '드럼 없음'이지만 AI가 드럼 악기를 넣었으면 발라드 후렴 드럼으로
  song.style.genre = 'K-pop ballad';
  const res2 = await arrangeSong(song, { targetIds: ['v'] });
  assert.equal(res2.sections[0].drum, 'ballad');
  assert.equal(res2.sections[0].bass, 'long');
  delete globalThis.window;
  console.log('ai fallback OK');
}

// 음계 밖 화음 (D-025): 글자 토큰 '4m'·'5M'·'3d7'·'b7M' — 소리·이름·칩·AI 검사·멜로디 칠하기
{
  const { chordNotes, chordName, isChord, parseChord, chordPitchClasses, chordFeel, isDiatonic, findProgression } = await import('../src/js/music/theory.js');
  const C = 0;
  const A = 9;
  assert.deepEqual(chordNotes(C, 'major', '4m').map((n) => n % 12), [5, 8, 0], 'C장조 iv = Fm');
  assert.equal(chordName(C, 'major', '4m'), 'Fm');
  assert.equal(chordName(C, 'major', '4m', true), 'Fm7');
  assert.equal(chordName(C, 'major', '3d7'), 'E7', 'III7');
  assert.equal(chordName(C, 'major', '6d7', true), 'A7', '도미넌트7은 7th 켜도 그대로');
  assert.equal(chordName(C, 'major', 'b7M'), 'B♭', '반음 내린 화음은 ♭ 이름');
  assert.equal(chordName(A, 'minor', '5M'), 'E', 'A단조 V');
  assert.equal(chordName(A, 'minor', '5d7'), 'E7');
  assert.equal(chordName(A, 'minor', 5), 'Em', '숫자 5는 자연단음계 v 그대로');
  assert.equal(chordName(A, 'minor', '4M'), 'D', '도리안 IV');
  assert.equal(chordName(A, 'minor', 'b2M'), 'B♭', '프리지안 ♭II');
  assert.deepEqual(chordNotes(C, 'major', 4), [53, 57, 60], '숫자는 예전과 같음');
  assert.equal(chordName(C, 'major', 4, true), 'Fmaj7');
  ['4m', '5M', '3d7', 'b7M', 1, 7].forEach((c) => assert.ok(isChord(c), String(c)));
  ['8m', '4x', '', '4', 0, 8, 'IV', null].forEach((c) => assert.ok(!isChord(c), String(c)));
  assert.deepEqual(parseChord('b6M'), { d: 6, flat: true, q: 'M' });
  assert.ok(isDiatonic(3) && !isDiatonic('3d7'));
  assert.deepEqual(chordPitchClasses(A, 'minor', '5M'), [4, 8, 11], '구성음 E G# B');
  assert.match(chordFeel('major', '4m'), /빌려온/);
  assert.match(chordFeel('minor', '5d7'), /화성단음계/);
  assert.equal(findProgression('major', [4, '4m', 3, 6, 2, 5, 1, 1]).id, 'ballad44m');
  assert.equal(findProgression('minor', [1, 7, 6, '5M']).id, 'andalusian');
  // 7th: 장3화음 글자는 지금 음계의 7음을 얹는다 (단조 V → V7, 도리안 IV → IV7, II → II7). ♭ 화음만 maj7
  assert.equal(chordName(A, 'minor', '5M', true), 'E7');
  assert.equal(chordName(A, 'minor', '4M', true), 'D7');
  assert.equal(chordName(C, 'major', '2M', true), 'D7');
  assert.equal(chordName(C, 'major', 'b7M', true), 'B♭maj7');
  assert.equal(chordName(A, 'minor', 'b2M', true), 'B♭maj7');
  assert.deepEqual(chordNotes(C, 'major', 4, true), [53, 57, 60, 64]);
  // ♭는 장음계 기준: 장·단조를 바꿔도 같은 음 (C단조의 b7M = B♭ = 음계 안 VII)
  assert.equal(chordName(C, 'minor', 'b7M'), 'B♭');
  assert.equal(chordName(C, 'minor', 'b2M'), 'D♭');
  // 음계 안 3화음과 같은 글자는 숫자로 (장·단조 바꾸기, AI 답)
  const { canonicalChord } = await import('../src/js/music/theory.js');
  assert.deepEqual(['4m', 'b7M', 'b6M', '5M', 'b2M', '5d7', 3].map((c) => canonicalChord('minor', c)), [4, 7, 6, '5M', 'b2M', '5d7', 3]);
  assert.deepEqual(['5M', '4M', '6m', '4m', 'b7M', '3d7'].map((c) => canonicalChord('major', c)), [5, 4, 6, '4m', 'b7M', '3d7']);
  assert.doesNotMatch(chordFeel('minor', '4m'), /빌려온/, '단조의 4m은 음계 안 iv');
  // 재생: 토큰 코드도 타임라인에 소리가 남 (패드 음이 Fm 구성음)
  const { buildTimeline } = await import('../src/js/music/timeline.js');
  const song = { sections: [{ id: 'x', type: 'Chorus' }], music: { bpm: 120, root: 0, mode: 'major', sections: { x: { bars: 1, chords: ['4m'], seventh: false, energy: 3, instruments: ['pad'], drum: 'none', bass: 'long', melody: [] } }, sounds: {} } };
  const pads = buildTimeline(song).events.filter((e) => e.inst === 'pad').map((e) => e.note % 12).sort((a, b) => a - b);
  assert.deepEqual(pads, [0, 5, 8]);
  console.log('borrowed chords OK');
}

// AI 편곡: 음계 밖 화음 글자는 받고, 모르는 글자는 예전처럼 1로
{
  const { arrangeSong } = await import('../src/js/ai-music.js');
  const { normalizeMusic } = await import('../src/js/music/arrangement.js');
  globalThis.__aiJson = async () => ({ summary: 's', sections: [{ id: 'v', bars: 8, chords: [4, '4m', ' 3d7 ', 'IV', 6, 'b7M'], energy: 2, instruments: ['drums'], drum: 'pop', bass: 'long' }] });
  globalThis.window = { claude: { use: async () => ({ json: (...a) => globalThis.__aiJson(...a) }) } };
  const song = normalizeMusic({ title: 't', sections: [{ id: 'v', type: 'Verse', members: [], text: '' }], members: [], references: [], style: { genre: 'K-pop ballad' }, concept: { moods: [], keywords: '', theme: '', story: '', group: 'girl' } });
  const res = await arrangeSong(song, { targetIds: ['v'] });
  assert.deepEqual(res.sections[0].chords, [4, '4m', '3d7', 1, 6, 'b7M']);
  // 곡 전체 편곡이 단조로 정하면 그 조의 음계 안 화음과 같은 글자는 숫자로
  globalThis.__aiJson = async () => ({ summary: 's', bpm: 90, root: 'A', mode: 'minor', sections: [{ id: 'v', bars: 4, chords: [1, '4m', 'b7M', '5M'], energy: 2, instruments: [], drum: 'none', bass: 'long' }] });
  const whole = await arrangeSong(song, {});
  assert.deepEqual(whole.sections[0].chords, [1, 4, 7, '5M']);
  delete globalThis.window;
  console.log('ai borrowed chords OK');
}
